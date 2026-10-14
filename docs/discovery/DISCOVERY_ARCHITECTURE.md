# DISCOVERY_ARCHITECTURE.md Update — Overlap Noted

A separate agent's `INTEGRATION_NOTES.md` content (recommendation branch) was observed at the root file. The automated discovery architecture remains in this file (`docs/discovery/DISCOVERY_ARCHITECTURE.md`) and in `docs/discovery/DISCOVERY_SETUP.md`. No architecture conflicts exist — the two branches touch different modules.

Pipeline components verified:
- Sources: website, rss, search adapters + facebook-boundary (honest limitations)
- Extraction: structured-extractor (untrusted input handled; timeouts; no eval/execute)
- Verification: evidence-verifier (evidence always retained; AI agreement never proof)
- Dedup: duplicate-detector (similarity comparison, not duplicate tables)
- Scan: scan-runner (retries bounded, rate limits, idempotency on candidate creation)
- API: app/api/discovery/scan/route.ts (protected endpoint, validates URL, does not approve)
- Tests: duplicate-detector and scan-runner assertions verified manually
- Migration: supabase/migration-discovery-automated-scan-jobs.sql (additive only)
