# OpportunityHub Audit Ledger

Cumulative record of every finding across audit cycles. New entries are
appended; resolved entries are never deleted.

Legend: **Status** = Fixed / Open / Accepted-risk / Needs-ops.

---

## Cycle 1 — Full audit & repair

### OH-001 — Unauthenticated-by-role SSRF via discovery scan endpoint
- **Severity:** Critical
- **Status:** Fixed
- **Location:** `app/api/discovery/scan/route.ts`, `lib/ingestion/scraper.ts`
- **Repro:** `POST /api/discovery/scan {"url":"http://169.254.169.254/latest/meta-data/"}`
  with any authenticated (non-admin) session. The route accepted any string
  starting with `http`, `DefaultFetchScraper` performed the fetch server-side,
  and no private-range/metadata blocking existed. Middleware only requires a
  logged-in user, so any student account could reach it. No rate limit.
- **Root cause:** URL validation limited to an `http(s)://` prefix check, applied
  at the wrong layer (route), with no admin authorization and no redirect
  re-validation.
- **Fix:**
  - New `lib/security/url-guard.ts`: protocol allowlist, internal-hostname
    denylist (`localhost`, `metadata.google.internal`, ...), IPv4/IPv6
    private/loopback/link-local/CGNAT/reserved blocking, and DNS resolution
    checks (rejects hostnames resolving to private addresses).
  - `DefaultFetchScraper.scrape()` now validates through the guard, follows
    redirects **manually** (max 5 hops) and re-validates each hop, and accepts
    an `AbortSignal`.
  - `/api/discovery/scan` now requires an admin role (`lib/auth/admin.ts`)
    before doing any work, and returns 403 otherwise.
- **Regression test:** `tests/security/url-guard.test.ts`,
  `tests/ingestion/scraper.test.ts`.
- **Verification:** `npm test` — 22/22 pass. With the pre-fix scraper restored,
  the same suite hangs while making live requests to `127.0.0.1:5432` etc.,
  confirming the guard is what prevents the internal fetches.

### OH-002 — Google OAuth client secret committed to the repository
- **Severity:** Critical
- **Status:** Fixed (secret **must still be rotated** — see Remaining Risks)
- **Location:** `AUTH_SETUP_INSTRUCTIONS.md`
- **Repro:** The tracked file contained a live-format Google OAuth client ID
  and `GOCSPX-…` client secret, plus the Supabase project ref and project host.
- **Root cause:** Setup documentation written with real values and committed.
- **Fix:** Replaced all real values with `<PLACEHOLDER>` tokens and added an
  explicit "never commit real values" note.
- **Verification:** `git grep -nE "GOCSPX-|googlesusercontent\.com|..."` over
  tracked files now returns only benign documentation URLs.

### OH-003 — Server actions callable without authorization
- **Severity:** High
- **Status:** Fixed
- **Location:** `lib/actions/discovery.ts`
- **Repro:** Every export of a `"use server"` module is a public endpoint.
  - `createDiscoveryCandidate` had no auth check and used
    `createAdminClient()` (service role → RLS bypassed), so any caller could
    insert rows into `discovery_candidates` and write `audit_events`.
  - `logAuditEvent` was exported with no auth check and likewise wrote via the
    service role, letting a visitor forge audit trails.
- **Root cause:** Internal pipeline helpers were placed in a `"use server"`
  module and therefore became publicly reachable actions.
- **Fix:**
  - Moved audit writing to server-only `lib/discovery/audit.ts` (not a
    `"use server"` module) and removed it from the actions surface.
  - `createDiscoveryCandidate` now authenticates the caller and verifies an
    `admin_roles` row before using the service-role client.
- **Verification:** Type-check + build confirm the actions module no longer
  exports `logAuditEvent`; the guard code is exercised by review.

### OH-004 — Scan timeout never reached the network call
- **Severity:** High
- **Status:** Fixed
- **Location:** `lib/discovery/scan-runner.ts`
- **Repro:** `runScan` created an `AbortController` and a timer, but called
  `adapter.discover(sourceUrl)` without the signal. `clearTimeout` then ran.
  A hung request therefore exceeded `timeoutMs` indefinitely.
- **Root cause:** Signal was constructed but never threaded through the
  adapter → scraper → `fetch` chain.
- **Fix:** `DiscoveryAdapter.discover(url, signal?)` now receives the signal;
  `WebsiteSourceAdapter` forwards it; `DefaultFetchScraper` passes it to
  `fetch`. Timeouts are cleared in `finally`, and an aborted run reports
  `Scan timed out after Nms`.

### OH-005 — Failed scans reported as successful
- **Severity:** High
- **Status:** Fixed
- **Location:** `lib/discovery/scan-runner.ts`
- **Repro:** `WebsiteSourceAdapter.discover()` catches fetch errors and returns
  `{ content: "", errors: [...] }` rather than throwing. `runScan` ignored
  `errors`, incremented `candidatesDiscovered`, and returned
  `status: "completed"`. The route then answered `{ success: true }`.
- **Root cause:** Adapters signal failure via a return value; the runner only
  handled thrown errors.
- **Fix:** `discoveryFailure()` inspects the outcome's `errors` array and
  converts it into a retryable failure.
- **Regression test:** `tests/discovery/scan-runner.test.ts` — "adapter-reported
  errors are treated as failure, not silent success".

### OH-006 — Rate-limit sleep applied after successful scans
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `lib/discovery/scan-runner.ts`
- **Repro:** On success the runner awaited `rateLimitMs` (2s default) before
  returning, adding dead latency to every successful scan.
- **Fix:** Delay now only applies between retries.

### OH-007 — Reviewer actions silently swallowed errors
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `app/admin/candidate/[id]/page.tsx`
- **Repro:** Inline form actions `async () => { await approveCandidate(id); }`
  discarded the returned `{ success, error }`, so a failed approval rendered as
  a no-op with no feedback and no revalidation.
- **Fix:** New client component `components/admin/CandidateReviewActions.tsx`
  uses `useTransition`, surfaces `result.error`, shows a success state, and
  calls `router.refresh()`. Approve is now the primary (destructive-free)
  variant rather than both being `outline`.

### OH-008 — Admin dashboard reported hardcoded zeros
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `app/admin/dashboard/page.tsx`
- **Repro:** "Approved Today" and "Flagged Issues" were literal `0`, so the
  dashboard always claimed zero activity regardless of the database.
- **Fix:** Added `getAdminDashboardStats()` in `lib/queries/discovery.ts`
  (exact `count` queries against `approval_queue` and unresolved `risk_flags`).

### OH-009 — User email addresses exposed publicly in community data
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `lib/queries/community.ts`, `components/community/CommunitySection.tsx`
- **Repro:** `getOpportunityComments` / `getOpportunityReviews` embedded
  `profiles(email, ...)` and the UI rendered the local part of the address as
  the author name, publishing e-mail addresses of school/organization accounts
  on public opportunity pages.
- **Fix:** Dropped `email` from both selects; display now falls back to
  `organization_name`, then a generic label. `user_email` was removed from the
  `OpportunityComment` / `OpportunityReview` types so it cannot be reintroduced
  accidentally.

### OH-010 — PostgREST filter injection via opportunity search
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `lib/queries/opportunities.ts`
- **Repro:** The search term was interpolated into a `.or()` expression string
  that already contains commas. A term containing `,` or parentheses can close
  the current expression and append attacker-chosen filters (e.g. exposing
  unverified rows).
- **Root cause:** A code comment incorrectly claimed Supabase escapes the value;
  PostgREST does not — the `.or()` argument is raw filter syntax.
- **Fix:** `sanitizePostgrestSearchTerm()` strips the structural characters
  `, ( ) " \` and collapses whitespace before interpolation.

### OH-011 — Unverified opportunities were recommended to students
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `lib/queries/recommendations.ts`
- **Repro:** The recommendation candidate pool filtered on `source_type` only,
  so `scraped` rows with `is_verified = false` could be surfaced to students —
  exactly the untrusted content the verification system exists to gate.
- **Fix:** Added `.eq("is_verified", true)`.

### OH-012 — No runnable test suite
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `package.json`, `tests/**`, `scripts/ts-paths*.mjs`
- **Repro:** `package.json` had no `test` script; the two test files used
  `console.assert`/`console.log` and "verified manually", and imported via the
  `@/` alias, which plain Node cannot resolve.
- **Fix:** Added `"test": "node --import ./scripts/ts-paths.mjs --test \"tests/**/*.test.ts\""`,
  a small resolver hook so tests use the project's `@/` convention, and
  converted both files into real `node:test` suites. Added
  `tests/security/url-guard.test.ts` and `tests/ingestion/scraper.test.ts`.

---

## Cycle 2 — Independent review of Cycle 1 changes

Review method: re-read every file changed in Cycle 1 as an independent reviewer,
then search for the same defect class elsewhere in the codebase.

### OH-013 — Second-order PostgREST injection in related-editions lookup
- **Severity:** Medium
- **Status:** Fixed
- **Location:** `lib/queries/publishers.ts`
- **Repro:** `getRelatedEditions()` interpolates `parentId` into
  `.or(\`id.eq.${parentId},parent_opportunity_id.eq.${parentId}\`)`. `parentId`
  comes from `opportunity.parent_opportunity_id`, a database value. No
  application action currently writes that column, so the column can only be
  populated via the service role or the SQL editor — but the code assumed a
  value that is, by contract, a UUID.
- **Root cause:** Same class as OH-010; raw interpolation into filter syntax
  without validating the interpolated value.
- **Fix:** Validate `parentId` against the shared `UUID_RE` (now exported from
  `lib/auth/account.ts`) and return `[]` if it is not a well-formed UUID.
- **Verification:** Static review; UUID format is enforced at the boundary.

### OH-014 — SSRF guard bypasses and a fail-open IPv6 case
- **Severity:** High
- **Status:** Fixed
- **Location:** `lib/security/url-guard.ts`
- **Repro (found by review, confirmed by test):**
  - `isPrivateIpv6()` compared **string prefixes** (`startsWith("fe80")`,
    `startsWith("fc")`). WHATWG serialises `http://[::ffff:127.0.0.1]/` as
    `[::ffff:7f00:1]` (hex), so the embedded IPv4 was compared against
    `"7f00:1"`, which is not a dotted quad and returned `true` — i.e. the
    check happened to fail closed, but for the wrong reason, and legitimate
    IPv4-mapped **public** addresses (e.g. `::ffff:808:808` = 8.8.8.8) were
    blocked as well.
  - A trailing-dot FQDN such as `http://localhost./` missed the hostname
    denylist and relied entirely on DNS returning a private address.
  - Missing ranges: `192.0.0.0/24` and `198.18.0.0/15`.
- **Fix:** Added `expandIpv6()`, which expands any IPv6 literal (including
  embedded dotted-quad forms) into its eight 16-bit groups, then classifies by
  prefix (`fe80::/10`, `fc00::/7`, `ff00::/8`) and by decoded embedded IPv4 for
  the `::ffff:a.b.c.d` / `::a.b.c.d` forms. Unparsable input **fails closed**.
  Hostnames are lowercased and trailing dots stripped before denylist lookup.
- **Regression tests:** IPv4-mapped decode, public IPv6 acceptance,
  fail-closed parsing, trailing dot, decimal/hex/octal IP literals, expanded
  IPv6 loopback — all in `tests/security/url-guard.test.ts`.
- **Note:** WHATWG already normalises decimal/hex/octal IP literals to canonical
  IPv4 (`http://2130706433/` → `127.0.0.1`), which the guard then blocks. This
  was verified rather than assumed.

### OH-015 — Open redirect in the OAuth callback
- **Severity:** High
- **Status:** Fixed
- **Location:** `app/auth/callback/route.ts`
- **Repro (confirmed exploitable):** `GET /auth/callback?code=…&next=@evil.com`
  produced `redirect("https://app.example.com" + "@evil.com")`. URL parsing
  treats `app.example.com` as userinfo and resolves the host to **`evil.com`**.
  The callback ends with exactly this concatenation, so a valid auth code plus
  a crafted `next` lands the user on an attacker-controlled origin right after
  sign-in. `next` was read straight from the query string with no validation.
- **Pre-existing:** confirmed via `git diff` that this was in `HEAD`; the
  working-tree change to this file only added error logging.
- **Fix:** Extracted `safeNextPath()` into `lib/auth/redirects.ts` (a
  dependency-free module so it is unit-testable outside the Next runtime). It
  accepts only single-slash same-origin paths and rejects `//host`, `/\host`,
  percent-encoded separators (`%2f`, `%5c`), embedded `//`, explicit schemes,
  and non-slash-relative values.
- **Regression tests:** `tests/auth/next-path.test.ts` plus an origin-escape
  battery in `tests/security/adversarial.test.ts` that asserts the resolved
  host is always the application host.

### OH-016 — Password reset flow did not exist
- **Severity:** Medium (missing feature)
- **Status:** Fixed
- **Location:** `lib/actions/auth.ts`, `app/(auth)/forgot-password/`,
  `app/(auth)/reset-password/`, `components/auth/{ForgotPasswordForm,ResetPasswordForm}.tsx`
- **Repro:** `grep` for `resetPasswordForEmail` / `reset-password` across the
  repo returned no matches. Users who forgot a password had no recovery path.
- **Fix:** Added `requestPasswordReset()` (calls
  `supabase.auth.resetPasswordForEmail`) and `updatePassword()` (requires an
  active recovery session via `getUser()`, validates match + 8-char minimum),
  plus both pages and forms following the existing `useActionState` /
  `AuthState` conventions.
- **Security properties:** The request action returns an identical success
  message whether or not the address exists (no account enumeration). The
  redirect origin is built from `NEXT_PUBLIC_SITE_URL` / `VERCEL_URL` with a
  localhost fallback — **never** from the request — so Host-header injection
  cannot redirect recovery emails.
- **Proxy change:** `/forgot-password` and `/reset-password` were added to
  `isPublicRoute()`; without this both returned 307 → `/login` and the flow was
  unreachable while signed out. Verified with curl before and after.

### OH-017 — `middleware` file convention deprecated in Next.js 16
- **Severity:** Low
- **Status:** Fixed
- **Location:** `middleware.ts` → `proxy.ts`
- **Repro:** Build emitted
  `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **Fix:** `git mv middleware.ts proxy.ts` and renamed the export to `proxy`,
  per `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.
- **Verification:** Build warning gone, output now reports `ƒ Proxy (Middleware)`.
  Live routing re-checked: `/dashboard` → 307 `/login`, `/opportunities` → 200,
  `/login` → 200, `POST /api/discovery/scan` → 307 (blocked before the handler).

---

## Cycle 3 — Adversarial audit

Review method: actively attack the fixes from Cycle 1/2 with bypass payloads,
then systematically enumerate every server action and route handler looking for
the same defect class.

### OH-018 — Ingestion server actions callable by any signed-in user (cost/DoS)
- **Severity:** High
- **Status:** Fixed
- **Location:** `lib/actions/ingestion.ts`
- **Repro:** `app/(app)/opportunities/ingest/page.tsx` correctly redirects
  non-publisher accounts, **but** page-level checks do not protect exported
  server actions. `ingestFromUrl()` and `ingestFromImage()` are `"use server"`
  exports, therefore directly callable POST endpoints, and neither performed an
  authorization check. Any signed-in **student** could invoke them directly and:
  1. force an outbound server-side fetch to an attacker-chosen URL, and
  2. trigger paid Gemini work — `formatRawTextToOpportunity` and
     `extractTextFromImage` call the Gemini `generateContent` endpoint with a
     raw `fetch` in `lib/ingestion/formatter.ts` and `lib/ingestion/ocr.ts`,
     completely bypassing the `generateWithUserQuota()` accounting used by every
     other AI feature.
- **Root cause:** Identical to OH-003 — trusted UI gating mistaken for endpoint
  authorization.
- **Fix:** Added a shared `requirePublisherAccount()` helper (session check +
  `canManageOpportunities()`) and applied it as the first statement of both
  `ingestFromUrl()` and `ingestFromImage()`, before any fetch or AI call.
- **Verification:** Static review; `saveIngestedOpportunity` already used the
  identical check, confirming the intended policy.

### Adversarial verification of the Cycle 1/2 fixes
- **Status:** No bypass found.
- Added `tests/security/adversarial.test.ts` exercising **37 SSRF payloads**
  (`127.1`, `0177.0.0.1`, `2130706433`, `0x7f.0x0.0x0.0x1`, `0.0.0.0`, `0`,
  `localtest.me`, `127.0.0.1.nip.io`, `[::ffff:a9fe:a9fe]`,
  `[0:0:0:0:0:ffff:169.254.169.254]`, `gopher://`, `dict://`, `jar:`, `file://`,
  userinfo smuggling, circled Unicode `localhost`, and more) plus a
  **17-payload** redirect battery. All blocked; zero leaked.
- Restoring the pre-fix scraper and re-running the suite caused it to hang while
  making live requests to `127.0.0.1:5432`, which is direct evidence the guard
  is what stops the internal fetches.

### Systematic server-action authorization sweep
Enumerated every `"use server"` module and every exported action. Confirmed
correct in: `activities.ts`, `community.ts`, `create-opportunity.ts` (update and
delete are scoped by `.eq("created_by", user.id)`), `onboarding.ts`,
`opportunities.ts`, `opportunity-enrich.ts` (quota-bounded),
`organization-profile.ts`, `school-invites.ts` (gated by `requireSchoolAccount`),
`auth.ts`, `discovery.ts`, and `ai.ts` (gated by `getProfile()` +
`generateWithUserQuota`). Only `ingestion.ts` was missing a check (OH-018).

### Checked and found sound (no change needed)
- `create-opportunity.ts` validates `type`/`subject_area` against allowlists and
  runs registration URLs through `sanitizeRegistrationUrl()`, which rejects
  `javascript:`, `data:`, and `vbscript:` schemes.
- `admin_roles` RLS: `is_admin()` / `is_superadmin()` are `SECURITY DEFINER`
  with `set search_path = public`; the self-insert path is closed because only
  superadins may manage roles.
- Cron routes already require `Authorization: Bearer $CRON_SECRET` **and** a
  configured service-role key.
- `approval_queue.priority` is `integer` with a `desc` index, so
  `getApprovalQueue()`'s ordering is correct (an earlier suspicion was wrong).

---

## Residual risks / accepted limitations

- **RR-1 — DNS rebinding (TOCTOU).** `assertSafeOutboundUrl()` resolves the
  hostname to validate it, but `fetch` resolves DNS again. An attacker
  controlling DNS could return a public address to the validation lookup and a
  private one to the fetch. Fully closing this requires pinning the resolved IP
  into the connection (a custom undici `lookup`/`Agent`), which is a larger
  change than this audit's scope. All other SSRF vectors are closed.
- **RR-2 — Gemini spend on the ingest path.** `formatter.ts` and `ocr.ts` call
  Gemini directly and are not metered by `generateWithUserQuota()`. OH-018
  restricts the path to publisher accounts, but publisher accounts still have
  unmetered AI spend.
- **RR-3 — Rotated secrets.** The Google OAuth client secret removed in OH-002
  remains in git history and must be **rotated** in Google Cloud / Supabase.
  Scrubbing the working tree does not rewrite history.
- **RR-4 — `is_admin()` execute grants.** The migration grants execute to
  `authenticated` but does not explicitly `revoke` from `anon`/`PUBLIC`.
  Harmless as written (the functions only read `admin_roles`), but tightening is
  a DB change.
- **RR-5 — `BREVO_API_KEY` is empty.** Deadline reminders and the newsletter
  cannot send. Verified as code-correct only; not runtime-verified.
- **RR-6 — Over-fetching.** `getOpportunities()` and several admin queries still
  use `.select("*")`, pulling `raw_source_text` and other wide columns. Safe but
  wasteful; left unchanged to avoid breaking response shapes used by the UI.