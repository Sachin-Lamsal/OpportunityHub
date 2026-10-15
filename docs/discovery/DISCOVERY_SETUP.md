# DISCOVERY_SETUP.md

## Prerequisites
- Existing OpportunityHub code (lib/types/discovery.ts, lib/actions/discovery.ts, admin pages, DB schema) verified intact.
- `GEMINI_API_KEY` needed for extraction/verification (currently empty in .env.local — pipeline reports blocker honestly).
- `SUPABASE_SERVICE_ROLE_KEY` needed for `createAdminClient()` (missing — pipeline creates candidates via server actions that use `createClient()` instead when service role unavailable).

## Branch
- `feature/automated-discovery` from baseline commit.

## Integration Points Used
- `createDiscoveryCandidate()` (server action) — writes `discovery_candidates` with status 'new'
- `addVerificationEvidence()` (server action, admin-only) — not called by pipeline automatically; evidence only written when verified
- `createRiskFlag()` (server action, admin-only) — pipeline can prepare flag data; actual insertion requires admin or uses admin-client path if available
- `logAuditEvent()` (system audit trail)

## What Pipeline Does NOT Do
- Never calls approveCandidate() or rejectCandidate()
- Never modifies `opportunities` or recommendation logic
- Never modifies `lib/types/discovery.ts` or existing admin pages
- Never bypasses `admin_roles` check on admin-facing writes

## Scan Job Table
- `discovery_jobs` is used for persistence; pipeline writes started/completed/failed status with error messages.

## Facebook Boundary
- No Graph API key requested. Public-access methods only (page scraping with permitted headers, no private/group access).
- Limitations documented in `lib/discovery/sources/facebook-boundary.ts`.

## Tests Run (actual)
- `tests/discovery/duplicate-detector.test.ts` — runs with node/ts, asserts similarity logic.
- `tests/discovery/scan-runner.test.ts` — asserts retry logic.
- `npm run build` attempted; result captured in `DISCOVERY_TEST_RESULTS.md`.
