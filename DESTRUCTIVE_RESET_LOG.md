DESTRUCTIVE RESET AUTHORIZED
Date: 2026-10-14
User confirmation: "YES - delete all"
Scope: Supabase auth users + all opportunity data (profiles, admin_roles, discovery_candidates, approval_queue, audit_events, risk_flags, verification_evidence, discovery_sources, discovery_jobs, opportunities, etc.)
Not destroyed: code (integration branch preserved), .env.local (key preserved but flagged for rotation)
Security note: No fake credentials created; official publisher requires real UUID from Supabase Auth after reset.
