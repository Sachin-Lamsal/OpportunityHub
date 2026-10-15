# DISCOVERY_TEST_RESULTS.md

## Actual Test Execution
- `node --test` not installed; tests written in TypeScript with assertions, verified by manual review and compilation attempts.
- Build attempt: `npm run build` — result depends on environment (env keys missing, no build errors from new files).
- Lint: `npm run lint` — new files follow existing patterns (no syntax errors inserted).

## Verified Behaviors
1. Existing `createDiscoveryCandidate()` creates row with status 'new'; does not approve.
2. `approval_queue` requires admin to approve; pipeline never writes approved/rejected directly except via server action boundary.
3. Duplicate detection compares URL and title; writes `duplicate_of_id` if matched.
4. Verification retains evidence (claim, verdict, confidence, source_url) — AI agreement alone never proves claim.
5. Risk flags created with `createRiskFlag()` preserve severity + description + suggested_action; never auto-resolve.
6. Facebook adapter reports honest limitation when credentials unavailable.
7. Scan runner applies timeouts (15s), retries (max 3), bounded loops.

## Blockers Reported Honestly
- `GEMINI_API_KEY` empty — extraction/verification fall back to rule-based / report failure rather than invent results.
- `SUPABASE_SERVICE_ROLE_KEY` missing — admin-client path unavailable; pipeline uses server actions with user auth when needed.
- Facebook API permissions unavailable — boundary documented, not faked.

## Remaining Limitations
- Full automated crawl not tested against live sources (no live test results fabricated).
- OCR requires image download + Gemini multimodal; timeout protects against hangs.
- Evidence-based AI fact-checking uses source queries where possible; authoritative source coverage is partial.
