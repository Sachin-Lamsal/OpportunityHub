# OpportunityHub — smoke test checklist

Run after `npm run dev` locally or on a Vercel preview. Requires Supabase + env configured (see README).

## Prerequisites

- [ ] `npm run build` succeeds
- [ ] All four files in the order shown in `supabase/README.md` applied
- [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL`
- [ ] Optional: `GEMINI_API_KEY` for AI; `BREVO_*` + `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` for crons

## Guest / public

- [ ] `/` loads marketing page
- [ ] `/opportunities` lists opportunities without login
- [ ] `/opportunities/[id]` detail loads without login

## Student

- [ ] `/signup/student` → account created
- [ ] Redirect to `/onboarding` (new student) → complete wizard → `/dashboard`
- [ ] Dashboard shows portfolio score, recent activity, opportunities
- [ ] Save / unsave opportunity; toggle deadline reminder (if deadline exists)
- [ ] `/portfolio/add` and link from opportunity detail (`+ Add to Portfolio`)
- [ ] `/cv-builder` generates CV text
- [ ] `/ai-suggestions` — suggestions or fallback without Gemini
- [ ] Opportunity detail → **Generate AI details** (needs Gemini)
- [ ] `/profile` — update fields; newsletter toggle saves

## School

- [ ] `/signup/school` → `/school/dashboard` with **school code**
- [ ] Create invite code in school settings; student signs up with code → linked on `/school/students`
- [ ] `/opportunities/new` → save as a draft or submit for administrator review
- [ ] Request publisher verification; an administrator approves it at `/admin/publisher-review`
- [ ] `/school/[id]` public profile (when logged in or anon)

## Organization

- [ ] `/signup/organization` → `/org/dashboard`
- [ ] Same draft, submission, and review flow as schools (no student roster)

## Auth & roles

- [ ] Student cannot open `/school/dashboard` (redirect to student dashboard)
- [ ] Logout returns to correct portal login
- [ ] `/auth/callback` works after email link (if confirm email enabled)
- [ ] Superadmin can approve a publisher profile and submitted listing at `/admin/publisher-review`

## Production-only (optional)

- [ ] Vercel env vars match `.env.local.example`
- [ ] Supabase **Site URL** + redirect URLs include production domain
- [ ] `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` sends test email
- [ ] `GET /api/cron/newsletter` (1st of month on Vercel) with same auth
- [ ] `npm run test:gemini` passes on production key
