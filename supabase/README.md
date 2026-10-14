# OpportunityHub — Supabase Database Setup

## Option 1: Fresh All-in-One Setup (Recommended)
Paste and run `setup-all.sql` in **Supabase Dashboard → SQL Editor → New query → Run**.
This single script sets up:
- Complete database schema & tables (`profiles`, `opportunities`, `saved_opportunities`, `activities`, `school_invite_codes`, `ai_user_usage`)
- Multi-role RBAC for students, schools, and organizations
- Invite code verification & redemption RPCs
- Public school code lookup RPC (`resolve_school_by_code`)
- Secure Row Level Security (RLS) policies and triggers (including public guest access to opportunities)
- All integrated verified opportunities seed data (Parts 1, 2, and 3 with official registration URLs)
- Deadline reminder and notification preferences for Brevo/Resend

*(Alternatively, run `complete-schema.sql` then `seed-opportunities.sql` — the seed file merges parts 1–3. Use `seed-opportunities-part3.sql` only if you seeded with an older part-1-only file; see migration step 8.)*

Legacy split files `schema.sql`, `opportunities.sql`, and `activities.sql` were removed; use `complete-schema.sql` or `setup-all.sql` instead.

## Option 2: Incremental Migrations (for Existing Databases)
If you already ran an older version of `complete-schema.sql`, run the migrations in order:
1. `migrate-account-types.sql` (multi-role profiles & opportunities)
2. `migrate-school-invites-and-settings.sql` (invite codes & school settings)
3. `migrate-opportunity-ai-fields.sql` (Gemini enrichment columns)
4. `migrate-ai-usage.sql` (monthly rate limits)
5. `migrate-public-opportunities.sql` (public/guest browsing for opportunities)
6. `fix-profiles-recursion.sql` (resolves RLS infinite recursion on profiles)
7. `migration-email-reminders.sql` (deadline reminder toggles & newsletter preferences)
8. `seed-opportunities-part3.sql` (official registration links, removals & corrections)
9. `migration-ingestion-and-verification.sql` (verification status, source tracking, verify/reject RPCs)
10. `migration-opportunity-ai-enrich-rpc.sql` (safe `save_opportunity_ai_enrichment` RPC for student AI detail saves)
11. `migration-community-and-onboarding.sql` (comments, reviews, follows, onboarding, activity ↔ opportunity link)
12. `migration-opportunity-publisher-fixes.sql` (publisher-only verify/reject, tighter UPDATE RLS, drop duplicate title index)

Fresh installs using **`setup-all.sql`** already include steps 9–12; run incremental migrations only on older databases.
