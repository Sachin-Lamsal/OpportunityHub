# OpportunityHub

A web app for secondary school students in Kathmandu to discover opportunities, track portfolio activities, and build CVs.

Built for NEB, IGCSE, AS, and A-Level students preparing university portfolios.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth & DB | Supabase |
| AI (optional) | Google Gemini API |
| Hosting | Vercel |

## Features

### Students

- Sign up / log in with education level and dream university (optional school or invite code)
- Browse and filter opportunities (search, subject, type, deadline, format, verification status)
- Save opportunities and optional deadline email reminders
- Log portfolio activities by category and onboarding wizard
- Rule-based portfolio strength score (6 categories)
- AI suggestions, AI advisor chat, and per-opportunity AI detail generation (optional)
- CV builder with copy-to-clipboard and optional AI enhancement

### Schools and organizations

- Save opportunities as drafts or submit them for administrator review
- Request publisher-profile verification; approved listings become public after review
- Public publisher profiles are available at `/school/[id]` and `/org/[id]`
- Schools: invite codes, linked student roster, view student activity summaries

### Account portals

Use `/login` or `/signup` to choose **Student**, **School**, or **Organization**, or go directly to `/login/student`, `/login/school`, or `/login/organization`.

## Quick start (local)

### 1. Install

```bash
cd opportunityhub
npm install
cp .env.local.example .env.local
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy **Project URL** and **anon key** into `.env.local`
3. In **SQL Editor**, run these files one at a time, in this order:
   - `supabase/setup-all.sql`
   - `supabase/migration-discovery-verification-system.sql`
   - `supabase/migration-security-hardening.sql`
   - `supabase/migration-publisher-workflows.sql`
   - `supabase/migration-ai-enrichment-authorization.sql` (existing databases only; new installs already include it)

   Run `setup-all.sql` first. It creates the base schema and seed data. Then run the migrations in the order listed above. See `supabase/README.md` for the complete setup process.
4. **Authentication → Providers → Email** — turn off **Confirm email** for easier local testing

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Enable AI (Gemini)

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add `GEMINI_API_KEY=...` to `.env.local`
3. Restart the dev server: `npm run dev`

**What AI does in this app:**

| Feature | Where | Behavior |
|---------|-------|----------|
| Suggestions | Dashboard, `/ai-suggestions` | Picks opportunities from your database |
| CV enhance | `/cv-builder` | Bullet points from your activities |
| Opportunity details | Each opportunity page | Generates prep resources, steps, timeline — **saved via Supabase RPC** (whitelist columns only) |

**Opportunity enrichment flow:**

1. Open any opportunity → click **Generate AI details** (first time)
2. Gemini structures prep resources, application steps, eligibility, portfolio tips
3. Results are **written to the `opportunities` table** (`ai_summary`, `prep_resources`, etc.)
4. Next visit loads from the database instantly — no API call
5. Click **Refresh with AI (latest)** only when you want to re-fetch the registration page and update

Without Gemini, suggestions use simple rules and opportunity pages show only seed/description data.

### 4a. "This page couldn't load" after setup

If every page that reads the database returns a server error, the app is running
without usable Supabase credentials. Placeholder values (`REPLACE_WITH…`,
`your-anon-key`, empty) are detected at startup and the exact variable is named
in the server log. Fix `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>   # NOT the secret key
```

Then restart the dev server (`NEXT_PUBLIC_*` values are read at start-up).
Run `supabase/README.md` in order if the tables are also missing.

### 5. Troubleshooting Gemini

Your key format may be **`AQ.`** (new Google auth key) or **`AIza`** (older standard key) — both are valid.

Test connectivity:

```bash
npm run test:gemini
```

| Error from test | What to do |
|-----------------|------------|
| `OK: gemini-... works` | Restart `npm run dev`, try **Generate AI details** again |
| `quota` / `rate limit` | Wait 1 minute, retry. Check https://ai.dev/rate-limit |
| `denied access` on 2.5 models | Normal — app falls back to 2.0-flash-lite automatically |
| `limit: 0` on free tier | Enable billing in Google AI Studio or create a fresh API key/project |

**Important:** After changing `.env.local`, always restart the dev server.

### AI credits (per user)

Each logged-in user gets a **monthly talk budget** (default **10** via `STUDENT_AI_TALKS_LIMIT` or `AI_TALKS_LIMIT`), split across:

| Tier | Default share | Models |
|------|---------------|--------|
| Premium | 6 | gemini-flash-latest, gemini-3.6-flash, gemini-3.5-flash |
| Standard | 4 | gemini-flash-lite-latest, gemini-3.5-flash-lite |

- Requests use **premium** first, then **standard**; then fallback rules apply.
- **Page refresh does not use credits** — only clicking AI buttons does.
- Saved opportunity details load from Supabase without calling Gemini.
- Credits reset on the 1st of each month (UTC).
- Override with `AI_TIER_PREMIUM_LIMIT` and `AI_TIER_STANDARD_LIMIT`.

If credits are not tracking, confirm that all four database setup files completed successfully.

**Note:** URL/poster **ingestion** OCR and formatting call Gemini outside this quota.

### Email

| Type | Provider |
|------|----------|
| Signup confirmation, password reset | **Supabase Auth** (optional **Resend SMTP** in Supabase Dashboard — not configured in this repo) |
| Saved-opportunity deadline reminders | **Brevo** (`BREVO_*` env) via `/api/cron/reminders` |

For production reminders, set `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` on Vercel.

## Deploy to Vercel (step by step)

### 1. Put code on GitHub

From the project folder:

```bash
git init
git add .
git commit -m "Initial OpportunityHub MVP"
```

Create an empty repo on [github.com/new](https://github.com/new), then:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/opportunityhub.git
git push -u origin main
```

### 2. Import on Vercel

1. Sign in at [vercel.com](https://vercel.com) (GitHub login is easiest).
2. Click **Add New → Project** ([vercel.com/new](https://vercel.com/new)).
3. Select your `opportunityhub` repository.
4. Leave **Framework Preset** as Next.js — defaults are fine.
5. Under **Environment Variables**, add:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same page |
| `NEXT_PUBLIC_SITE_URL` | Yes | Your Vercel URL, e.g. `https://opportunityhub.vercel.app` |
| `GEMINI_API_KEY` | For AI | From Google AI Studio |
| `AI_TIER_PREMIUM_LIMIT` | No | Default 8 |
| `AI_TIER_STANDARD_LIMIT` | No | Default 15 |
| `AI_TIER_BASIC_LIMIT` | No | Default 25 |

6. Click **Deploy** — first build takes ~1–2 minutes.
7. When done, Vercel gives you a live URL like `https://opportunityhub-xxx.vercel.app`.

**Alternative (CLI):** install Vercel CLI (`npm i -g vercel`), run `vercel login`, then `vercel` in the project folder and follow prompts.

### 3. Configure Supabase for production

In Supabase **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` (keep for local dev) |

Update `NEXT_PUBLIC_SITE_URL` on Vercel to match your production URL, then **Redeploy** (Deployments → ⋯ → Redeploy).

### 4. After deploy

- Sign up on the live site to confirm auth works.
- Open an opportunity → **Generate AI details** once to test Gemini.
- Every git push to `main` can auto-deploy if you enabled that in Vercel project settings.

## Project structure

```
app/
  (auth)/           Login, signup
  (app)/            Dashboard, opportunities, portfolio, CV, profile, AI
  auth/callback/    Supabase auth redirect handler
components/
  ai/               AI suggestions panel
  auth/             Login, signup, profile forms
  cv/               CV preview and builder
  layout/           Header, nav, footer, page headers
  opportunities/    Feed, cards, filters, save button
  portfolio/        Activities, scores, forms
  ui/               Button, Card, Input, Select, etc.
lib/
  actions/          Server actions (auth, activities, AI, opportunities)
  ai/               Gemini client, prompts, fallback
  cv/               CV generation helpers
  portfolio/        Score calculation
  queries/          Supabase read helpers
  supabase/         Browser, server, middleware clients
supabase/
  setup-all.sql                              Base schema and opportunity data
  migration-discovery-verification-system.sql  Administrator and discovery system
  migration-security-hardening.sql           Database privacy protections
  migration-publisher-workflows.sql          Publisher and listing review workflow
  migration-ai-enrichment-authorization.sql  Ownership check for AI enrichment writes
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Environment variables

See `.env.local.example` for all variables.

**Never commit `.env.local`** — it is gitignored. The example file is safe to commit.

## Database tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (account type, education, school link, org/school settings) |
| `opportunities` | Listings (verification, source type, AI enrichment fields) |
| `saved_opportunities` | User bookmarks and reminder preferences |
| `activities` | Portfolio activity log |
| `school_invite_codes` | School invite redemption |
| `ai_user_usage` | Per-user monthly AI credit counters |
| `opportunity_comments` / `opportunity_reviews` | Community on listing pages |
| `organization_follows` | Follow school/org publishers |

**Verification:** Publisher profile verification and opportunity verification are separate. Publishers save drafts or submit listings for review; an administrator publishes approved listings. See `migration-publisher-workflows.sql`.

## MVP limits

Designed for ~10–50 users on free tiers. No custom ML — AI uses Gemini API only when configured.

## Your deployment checklist (manual steps)

The app code is ready when `npm run build` passes. You still need to configure services outside the repo:

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → Run** `supabase/setup-all.sql`, then in order run `migration-discovery-verification-system.sql`, `migration-security-hardening.sql`, and `migration-publisher-workflows.sql`. Existing databases should also run `migration-ai-enrichment-authorization.sql`.
3. **Authentication → URL configuration:** set Site URL and add `https://<your-domain>/auth/callback` (and localhost for dev).
4. **Authentication → Email:** disable **Confirm email** for local dev, or configure **SMTP** (e.g. Resend) for production.
5. Copy **Project URL**, **anon key**, and (for crons) **service role key** into env.

Use the four-file setup sequence in `supabase/README.md` for every installation.

### 2. Local environment

```bash
cp .env.local.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_*, NEXT_PUBLIC_SITE_URL, GEMINI_API_KEY (optional)
npm install && npm run dev
```

Validate with **`docs/SMOKE-TEST.md`**.

### 3. Vercel

1. Import the GitHub repo; set all env vars from `.env.local.example` for **Production**.
2. Set `NEXT_PUBLIC_SITE_URL` to the Vercel URL (then update Supabase redirect URLs).
3. Set `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_*`, and `CRON_SECRET` before relying on crons.
4. Deploy; confirm `/api/cron/reminders` and `/api/cron/newsletter` in project **Cron** tab (`vercel.json`).

### 4. Optional but recommended

- `npm run test:gemini` after adding `GEMINI_API_KEY`
- Brevo: verify sender domain for `BREVO_FROM_EMAIL`
- Monitor Supabase logs for RLS errors after first real users

## License

Private / learning project.

--- INTEGRATION STATUS (2026-10-14) ---
Branch: integration/opportunityhub-complete
Discovery pipeline: implemented (sources, extraction, verification, dedup, flags, scans)
Recommendations: preserved (scoring.ts intact; connects to verified opportunities)
Admin approval: intact (existing workflow verified)
Build: Compiled successfully
External blockers (documented, not fabricated): Gemini key, Facebook app, official profile
