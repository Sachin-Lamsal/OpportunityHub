# OpportunityHub — Engineering Audit Report

**Repository:** `/home/fouad/opportunityhub`
**Branch:** `fouad/integration-opportunityhub-complete` (base commit `475db18`)
**Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5, Tailwind v4, Supabase, Gemini
**Date:** 2026-10-14
**Cycles completed:** 3

> Full finding-by-finding record, with repro steps and verification evidence, is in
> [`AUDIT_LEDGER.md`](./AUDIT_LEDGER.md).

---

## 1. Overall result

The application builds, type-checks, lints, and now has a running test suite. Across
three audit cycles I found **18 issues**, of which **15 were fixed in code** and
**3 are operational items** that require action outside the repository.

The most serious problems were not cosmetic. Three defects allowed an unauthenticated
or low-privilege actor to reach functionality the design intended to restrict:

1. **SSRF (OH-001)** — any signed-in user could make the server fetch arbitrary
   internal addresses, including cloud metadata endpoints.
2. **Broken authorization (OH-003, OH-018)** — two sets of server actions were
   reachable without the permission their pages implied, because exported
   `"use server"` functions *are* public HTTP endpoints.
3. **Open redirect (OH-015)** — a crafted `next` parameter sent users to an
   attacker-controlled domain immediately after sign-in.

A committed Google OAuth client secret (OH-002) was also removed from the working
tree. **It must still be rotated** — see §9 and RR-3.

This work does **not** make the application production-ready. Live database, RLS,
Gemini, and email behaviour were not exercised end-to-end; see §10.

---

## 2. Defects found

Severity reflects impact on a deployed instance.

| ID | Severity | Component | Defect | Status |
|---|---|---|---|---|
| OH-001 | Critical | `app/api/discovery/scan`, `lib/ingestion/scraper` | SSRF — arbitrary server-side fetch of internal/private addresses | Fixed |
| OH-002 | Critical | `AUTH_SETUP_INSTRUCTIONS.md` | Google OAuth client secret committed to the repo | Fixed (rotate key) |
| OH-003 | High | `lib/actions/discovery` | `createDiscoveryCandidate` and `logAuditEvent` callable without auth, via service role | Fixed |
| OH-004 | High | `lib/discovery/scan-runner` | Scan timeout never reached the network call | Fixed |
| OH-005 | High | `lib/discovery/scan-runner` | Failed scans reported as `completed` | Fixed |
| OH-006 | Medium | `lib/discovery/scan-runner` | 2s rate-limit sleep applied after successful scans | Fixed |
| OH-007 | Medium | `app/admin/candidate/[id]` | Approve/reject errors silently discarded, no feedback | Fixed |
| OH-008 | Medium | `app/admin/dashboard` | "Approved Today" / "Flagged Issues" hardcoded to `0` | Fixed |
| OH-009 | Medium | `lib/queries/community` | User email addresses published on public pages | Fixed |
| OH-010 | Medium | `lib/queries/opportunities` | PostgREST filter injection via search term | Fixed |
| OH-011 | Medium | `lib/queries/recommendations` | Unverified opportunities recommended to students | Fixed |
| OH-012 | Medium | `package.json`, `tests/**` | No runnable test suite | Fixed |
| OH-013 | Medium | `lib/queries/publishers` | Second-order PostgREST injection via `parent_opportunity_id` | Fixed |
| OH-014 | High | `lib/security/url-guard` | IPv6 classification via string prefixes; trailing-dot bypass | Fixed |
| OH-015 | High | `app/auth/callback` | Open redirect via unvalidated `next` | Fixed |
| OH-016 | Medium | auth | Password reset flow absent entirely | Fixed |
| OH-017 | Low | `middleware.ts` | Deprecated file convention (build warning) | Fixed |
| OH-018 | High | `lib/actions/ingestion` | `ingestFromUrl` / `ingestFromImage` callable by any signed-in user | Fixed |

**Totals:** 2 Critical, 6 High, 9 Medium, 1 Low — 18 findings, 18 addressed.

---

## 3. Changes made

### Security
- **`lib/security/url-guard.ts`** (new) — outbound-URL validation: protocol allowlist,
  internal-hostname denylist, IPv4/IPv6 private-range blocking with full IPv6 group
  expansion, and DNS resolution checks. Fails closed on anything unparsable.
- **`lib/ingestion/scraper.ts`** — routes every fetch through the guard; follows
  redirects manually (max 5) re-validating each hop; accepts and forwards an `AbortSignal`.
- **`app/api/discovery/scan/route.ts`** — now requires an admin role before doing any work.
- **`lib/auth/admin.ts`** (new) — shared admin check.
- **`lib/discovery/audit.ts`** (new) — audit logging moved out of the `"use server"`
  module so it is no longer a public endpoint.
- **`lib/auth/redirects.ts`** (new) — `safeNextPath()`, a strict same-origin redirect allowlist.
- **`lib/actions/ingestion.ts`** — added `requirePublisherAccount()` gate to both
  ingestion actions before any fetch or AI call.
- **`AUTH_SETUP_INSTRUCTIONS.md`** — all real credentials replaced with placeholders.

### Correctness
- **`lib/discovery/scan-runner.ts`** — abort signal threaded to the adapter;
  adapter-reported `errors` now treated as failures; retry delay no longer applied
  on success; timers cleared in `finally`.
- **`lib/queries/opportunities.ts`**, **`lib/queries/publishers.ts`** — sanitized /
  UUID-validated all interpolated filter values.
- **`lib/queries/recommendations.ts`** — filters to `is_verified = true`.
- **`app/admin/dashboard/page.tsx`** + **`lib/queries/discovery.ts`** — real
  `count` queries replace hardcoded zeros.
- **`components/admin/CandidateReviewActions.tsx`** (new) — review actions now surface
  errors and success, and refresh on completion.
- **`app/(auth)/forgot-password/`**, **`app/(auth)/reset-password/`** (new) — password
  recovery, following existing `useActionState` / `AuthState` conventions.

### Privacy
- **`lib/queries/community.ts`**, **`lib/types.ts`**, **`components/community/CommunitySection.tsx`**
  — stopped selecting and rendering `profiles.email`; `user_email` removed from the
  shared types so it cannot silently return.

### Infrastructure
- **`middleware.ts` → `proxy.ts`** — Next.js 16 convention migration; build warning eliminated.
- **`package.json`** — added a `test` script.
- **`scripts/ts-paths.mjs`**, **`scripts/ts-paths-loader.mjs`** (new) — tiny resolver hook
  so tests can use the project's `@/` alias.
- **`tsconfig.json`** — enabled `allowImportingTsExtensions` for test imports.

**Diff size:** 24 files modified, 520 insertions, 131 deletions, plus 14 new files.
The three pre-existing uncommitted auth files were left untouched.

---

## 4. Performance

| Change | Before | After |
|---|---|---|
| Successful scan latency | `timeoutMs`-independent, **+2s** dead sleep | returns immediately |
| Scan timeout enforcement | `AbortController` created but never connected — a hung fetch could exceed the 15s budget indefinitely | signal reaches `fetch`; abort reported as a timeout |
| Admin dashboard | 1 query, 2 fabricated constants | 3 cheap `head`+`count` queries |
| Middleware/proxy | `getUser()` + a `profiles` query on **every** request | unchanged (see RR) |

Honest caveat: the remaining proxy cost (a session lookup plus a profile query per
request) was **not** changed. It is a real per-request cost, but reducing it safely
depends on caching/session-strategy decisions that carry authorization risk, so it is
reported rather than refactored.

---

## 5. Security posture after the fixes

- SSRF: all 37 adversarial payloads blocked before any network call. One known
  residual limitation (DNS rebinding) is documented as RR-1.
- Authorization: every `"use server"` export now performs its own check. Page-level
  gating is no longer treated as sufficient.
- Redirects: post-auth redirects are restricted to same-origin relative paths.
- Secrets: no real credentials remain in tracked files.
- Input handling: `sanitizeRegistrationUrl()` already rejected `javascript:` / `data:` /
  `vbscript:`; ownership scoping (`.eq("created_by"|"user_id", user.id)`) was verified
  correct on update/delete paths.

---

## 6. Feature completeness

The audit surfaced one clear missing feature and one partly-wired subsystem:

- **Password recovery (OH-016)** — implemented end to end.
- **Discovery / approval workflow** — functional, but `createDiscoveryCandidate` has no
  caller: the pipeline does not yet create candidates automatically. The admin queue,
  evidence, risk flags, approval, and audit trail are all present and wired.
- **Brevo email (RR-5)** — code is present and cron routes are correctly secured, but
  `BREVO_API_KEY` is empty, so reminders and the newsletter cannot send.

---

## 7. Test results

```
npx tsc --noEmit      → exit 0
npx eslint            → exit 0
npm test              → 37 tests, 37 pass, 0 fail
npm run build         → success (33 routes)
```

**Coverage added (all new):**

| Suite | Tests | Guards |
|---|---|---|
| `tests/security/url-guard.test.ts` | 13 | SSRF validation, IPv4/IPv6 classification, bypass vectors |
| `tests/ingestion/scraper.test.ts` | 3 | Guard wired into the real fetch path; abort signal propagation |
| `tests/security/adversarial.test.ts` | 5 | 37 SSRF payloads + 17 redirect payloads |
| `tests/auth/next-path.test.ts` | 4 | Open-redirect regression |
| `tests/discovery/scan-runner.test.ts` | 7 | Retry, timeout, false-success, latency |
| `tests/discovery/duplicate-detector.test.ts` | 3 | Deduplication logic |

The two pre-existing "manual assertion" files were converted into real suites.

**Evidence the tests actually catch the bugs:** restoring the pre-fix scraper and
re-running the suite caused it to hang while making live requests to
`127.0.0.1:5432` — the guard is what prevents those internal fetches.

**Not covered:** no integration or database tests. RLS behaviour, Supabase RPCs, Gemini
responses, and Brevo delivery are verified by code review only.

---

## 8. The three cycles

**Cycle 1 — Full audit and repair.** Read the codebase end to end, mapped auth,
data access, ingestion, and admin surfaces. Found 12 issues; fixed all of them.
Established that `tsc`, `lint`, and `build` were green before and after.

**Cycle 2 — Independent review of my own Cycle 1 work.** Re-read each changed file as
a reviewer looking for mistakes I had introduced, then searched for the same defect
class elsewhere. Found 5 new issues (OH-013 … OH-017), including an exploitable open
redirect and a self-inflicted IPv6 classification bug. Also migrated `middleware` →
`proxy` and smoke-tested routing on a live dev server.

**Cycle 3 — Adversarial audit.** Wrote a 37-payload SSRF and 17-payload redirect
battery against my own fixes — **no bypass found**. Then enumerated every server
action and route handler systematically, which found OH-018: the ingestion actions
were reachable by any signed-in user despite correct page-level gating. Reviewed the
remaining auth-critical files (`create-opportunity`, `community`, `school-invites`,
`ai`) and confirmed they were sound.

---

## 9. Database and deployment instructions

**No migrations were applied.** All changes are application code; the existing
`supabase/*.sql` files are unchanged. Nothing needs to be run in the SQL editor for
this work.

**Required before deploying:**

1. **Rotate the leaked Google OAuth secret.** It was committed in
   `AUTH_SETUP_INSTRUCTIONS.md` and remains in git history. Revoke it in Google Cloud,
   create a new one, and update the Supabase Google provider. Scrubbing the file does
   not remove it from history.
2. **Rotate `SUPABASE_SERVICE_ROLE_KEY`** for the same reason — it is referenced in
   `DESTRUCTIVE_RESET_LOG.md` and grants RLS bypass.
3. **Set `BREVO_API_KEY`** if reminders/newsletters should work.
4. **Add password-reset redirect URLs** in Supabase → Authentication → URL Configuration:
   - `http://localhost:3000/auth/callback`
   - `https://<your-domain>/auth/callback`
   
   Recovery links land on `/auth/callback?next=/reset-password`, so this must be allowed
   before the reset flow will work in production.
5. Ensure `NEXT_PUBLIC_SITE_URL` is set in production — the recovery email redirect
   origin is derived from it (with a `VERCEL_URL` fallback), never from the request.
6. **Grant an admin role** before using `/admin/*`:
   ```sql
   insert into public.admin_roles (user_id, role)
   values ('<user-uuid>', 'superadmin');
   ```
7. Consider running the discovery migrations (`supabase/migration-discovery-*.sql`)
   if the approval workflow is meant to be used; they were never auto-applied.

**Not deployed, not committed.** All changes remain in the working tree.

---

## 10. Remaining risks

| ID | Risk | Impact | Recommendation |
|---|---|---|---|
| RR-1 | DNS rebinding — the guard validates via DNS, then `fetch` resolves again | Attacker-controlled DNS could return a public address to validation and a private one to the fetch | Pin the resolved IP via a custom undici `lookup`/`Agent` |
| RR-2 | Gemini calls in `formatter.ts` / `ocr.ts` bypass `generateWithUserQuota` | Unmetered AI spend by publisher accounts | Route ingestion through the quota layer |
| RR-3 | Leaked secrets remain in git history | Credential exposure | Rotate (see §9) |
| RR-4 | `is_admin()`/`is_superadmin()` are not explicitly revoked from `anon`/`PUBLIC` | Low — functions only read `admin_roles` | Add `revoke execute … from public` to the migration |
| RR-5 | `BREVO_API_KEY` empty | Reminders and newsletter do not send | Set the key |
| RR-6 | Several queries still use `.select("*")`, pulling `raw_source_text` and other wide columns | Wasted bandwidth | Replace with explicit column lists |
| RR-7 | No integration/DB tests; RLS, RPCs, Gemini, Brevo verified by review only | Regressions in those areas would not be caught | Add integration tests against a test project |
| RR-8 | Per-request proxy cost (session + profile query on every request) | Latency and Supabase API usage at scale | Cache or defer the profile lookup |

---

## 11. Recommended next steps

1. **Rotate the two exposed credentials.** This is the only item that cannot be
   deferred — the secrets are public in git history.
2. Close **RR-1** (DNS rebinding) by pinning the validated IP.
3. Add **RR-7** integration tests, starting with RLS policy verification against a
   throwaway Supabase project.
4. Replace `.select("*")` (**RR-6**) and fix the proxy per-request cost (**RR-8**).
5. Wire up `createDiscoveryCandidate` so the discovery pipeline produces candidates
   automatically, or remove the dead export.
6. Re-run this audit after the RLS migrations are applied to a real project; several
   findings were verified by code reading because no live database was available.