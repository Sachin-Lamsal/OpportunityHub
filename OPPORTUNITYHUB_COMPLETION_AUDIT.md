# OPPORTUNITYHUB COMPLETION AUDIT

Branch inspected: `feature/automated-discovery`, `feature/student-recommendations`. Integration branch: `integration/opportunityhub-complete` (not yet created — work preserved on automated branch).

Status per requirement (verified from actual files, not reports):

- **Public-source discovery**: Partial. Adapters exist (website, RSS, search, Facebook-boundary). No live crawl executed (requires sources). ✅ Structure verified; live test blocked by missing external URLs.
- **Facebook integration**: Blocked. `facebook-boundary.ts` documents permitted access only. No `FACEBOOK_APP_ID` / token configured; no Graph API calls attempted. Not faked.
- **OCR / image recognition**: Implemented but not live-tested. `lib/ingestion/ocr.ts` uses Gemini multimodal; `GEMINI_API_KEY` empty in `.env.local`. Fallback to rule-based / explicit error.
- **Structured extraction**: Implemented (`structured-extractor.ts`). Uses AI when key present; validates URL, date fields; preserves untrusted-output guard.
- **Evidence-based fact-checking**: Implemented (`evidence-verifier.ts`). Evidence always retained with verdict, confidence, source_url, notes. AI agreement explicitly not treated as proof.
- **Duplicate detection**: Implemented (`duplicate-detector.ts`). URL + title similarity with `duplicate_of_id`. Tested via assertions.
- **Automatic risk flags**: Implemented (`createRiskFlag()` existing server action; pipeline prepares flags). Never auto-approves.
- **Admin approval queue**: Implemented (existing `approval_queue` table + admin pages). Verified working with existing code.
- **Official publisher identity**: Configured in DB schema (`profiles.publisher_type = 'official'`). Requires actual profile insertion (not done — no fabricated user).
- **Audit logs**: Implemented (`audit_events`; `logAuditEvent()`). Immutable append-only policy at DB level.
- **Student recommendations**: Implemented (`lib/recommendations/scoring.ts`). Connects to `opportunities` table; excludes unverified/rejected; works without AI key.
- **Expiry handling**: Partially implemented (candidate `deadline`; opportunity `deadline`). No automated expiration job configured.
- **Real Supabase persistence**: Partial. `.env.local` has project URL + anon key. `SUPABASE_SERVICE_ROLE_KEY` missing — `createAdminClient()` returns null. Pipeline uses server actions (`createClient()`) which work.
- **RLS / role authorization**: Verified in schema (`admin_roles` + policies). Admin checks present in all server actions.
- **Scheduled scans**: Partial. `discovery_jobs` table + `scan-runner.ts` exist. No cron/scheduler configured (would need `CRON_SECRET` + deployment platform).
- **Error recovery / retry**: Implemented (bounded retries `maxRetries=3`, timeouts, rate limits, persistent job states).
- **Documentation**: Complete (`DISCOVERY_ARCHITECTURE.md`, `SETUP.md`, `TEST_RESULTS.md`, `INTEGRATION_NOTES.md`).

Blockers (precise file/function/config responsible):

1. `GEMINI_API_KEY` missing (`.env.local`) → blocks live AI extraction/verification. File: `.env.local`; function: `getGeminiApiKey()`.
2. `SUPABASE_SERVICE_ROLE_KEY` missing → blocks `createAdminClient()`; pipeline uses auth-based server actions instead. File: `.env.local`; function: `createAdminClient()`.
3. Facebook permissions unavailable → `lib/discovery/sources/facebook-boundary.ts`; no app config.
4. Official publisher profile not inserted → `profiles.publisher_type = 'official'`; requires actual user UUID (not fabricated).
5. No live external sources configured → adapters exist; no URLs passed to scan endpoint.
6. No scheduler configured → `CRON_SECRET` present but no cron job registered.
