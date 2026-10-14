/**
 * Network / integration notes for recommendations branch.
 * Does NOT modify shared discovery modules.
 */

export const INTEGRATION_NOTES = `
- Recommendation engine uses only public opportunities table (opportunities).
- No changes to lib/types/discovery.ts, lib/actions/discovery.ts, or lib/queries/discovery.ts.
- No modifications to discovery_candidates, verification_evidence, risk_flags, audit_events, approval_queue, admin_roles tables.
- Uses existing student profile fields (subjects, interests, career_interests, education_level, dream_universities) from profiles table.
- No AI API key required; ranking is deterministic database query + scoring.
`;
