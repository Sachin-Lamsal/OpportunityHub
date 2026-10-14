# INTEGRATION_NOTES.md — Automated Discovery Pipeline (feature/automated-discovery)

NOTE: Another branch's INTEGRATION_NOTES.md content was observed on disk (recommendation branch notes). This file is the authoritative version for the automated discovery task (Task A) in branch `feature/automated-discovery`. The recommendation branch file (`feature/student-recommendations`) is a separate agent's work and should not be confused with this pipeline.

## Files Created (Automated Discovery)
- lib/discovery/sources/website-adapter.ts
- lib/discovery/sources/rss-adapter.ts
- lib/discovery/sources/search-adapter.ts
- lib/discovery/sources/facebook-boundary.ts
- lib/discovery/extraction/structured-extractor.ts
- lib/discovery/verification/evidence-verifier.ts
- lib/discovery/deduplication/duplicate-detector.ts
- lib/discovery/scan-runner.ts
- app/api/discovery/scan/route.ts
- docs/discovery/DISCOVERY_ARCHITECTURE.md
- docs/discovery/DISCOVERY_SETUP.md
- docs/discovery/DISCOVERY_TEST_RESULTS.md
- tests/discovery/duplicate-detector.test.ts
- tests/discovery/scan-runner.test.ts
- supabase/migration-discovery-automated-scan-jobs.sql

## Files Not Modified (per contract)
- lib/types/discovery.ts
- lib/actions/discovery.ts
- lib/queries/discovery.ts
- Existing admin pages (app/admin/dashboard/page.tsx, app/admin/queue/page.tsx, app/admin/candidate/[id]/page.tsx)
- Student-facing recommendation components / scoring logic
- Existing database migrations (only additive scan-jobs SQL added)

## Integration Contract Confirmed from Actual Code
- `createDiscoveryCandidate()` writes candidates (not approved/rejected)
- `createRiskFlag()` creates flags; `approveCandidate()` never called by pipeline
- `addVerificationEvidence()` used for evidence retention; `logAuditEvent()` for audit trail
- Database schema (`supabase/migration-discovery-verification-system.sql`) has required tables with RLS

## Overlap with Recommendation Branch
- The recommendation branch (`feature/student-recommendations`) creates separate files (`lib/recommendations/*`, `docs/recommendations/*`, `tests/recommendations/*`) and does NOT edit discovery files.
- This automated discovery branch (`feature/automated-discovery`) does NOT create recommendation-scoring files.
- There is no file conflict; only this `INTEGRATION_NOTES.md` at root was overwritten by the recommendation agent. The automated discovery notes are preserved above and in `docs/discovery/`.
