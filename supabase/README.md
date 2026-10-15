# OpportunityHub — Supabase Database Setup

Run these files in **Supabase Dashboard → SQL Editor → New query**, one at a time and in this exact order:

1. `setup-all.sql` — creates the application tables, access rules, functions, and initial opportunity data.
2. `migration-discovery-verification-system.sql` — creates administrator roles and discovery-review tables.
3. `migration-security-hardening.sql` — restricts database functions that could expose private account data.
4. `migration-publisher-workflows.sql` — creates publisher verification and the draft → review → published listing process.

All four files are safe to run again. Do not run more than these four files; the older split setup and upgrade scripts were intentionally removed to avoid conflicting instructions.

## After the SQL succeeds

1. Create an OpportunityHub account for yourself.
2. Add that account as the first `superadmin` in `admin_roles`.
3. Configure Supabase Authentication with your deployed URL and `https://YOUR-DOMAIN/auth/callback`.
4. Add the required environment variables in Vercel.

The main project README contains the deployment checklist and environment-variable list.
