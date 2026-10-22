# OpportunityHub — Supabase Database Setup

Run these files in **Supabase Dashboard → SQL Editor → New query**, one at a time and in this exact order:

1. `setup-all.sql` — creates the application tables, access rules, functions, and initial opportunity data.
2. `migration-discovery-verification-system.sql` — creates administrator roles and discovery-review tables.
3. `migration-security-hardening.sql` — restricts database functions that could expose private account data.
4. `migration-publisher-workflows.sql` — creates publisher verification and the draft → review → published listing process.
5. `migration-ai-enrichment-authorization.sql` — **existing databases only.** Re-states `save_opportunity_ai_enrichment` with the ownership check that `setup-all.sql` already contains, so databases installed before that fix are hardened too. Skip it for a brand-new project (step 1 already includes the guarded function).
6. `migration-school-student-enhancements.sql` — adds counselor activity-verification fields and the protected verification function. Skip it for a brand-new project only when the updated `setup-all.sql` has already been run.
7. `migration-participation-confirmations.sql` — adds student participation requests, school/organization confirmation, and confirmed-student reviews. This is required for every project.

All seven files are safe to run again. Do not run other setup or upgrade scripts; the older split ones were intentionally removed to avoid conflicting instructions.

## After the SQL succeeds

1. Create an OpportunityHub account for yourself.
2. Add that account as the first `superadmin` in `admin_roles`.
3. Configure Supabase Authentication with your deployed URL and `https://YOUR-DOMAIN/auth/callback`.
4. Add the required environment variables in Vercel.

The main project README contains the deployment checklist and environment-variable list.
