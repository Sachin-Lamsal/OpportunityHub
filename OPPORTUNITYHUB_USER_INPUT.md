# OPPORTUNITYHUB_USER_INPUT.md

Prioritized list of genuinely required inputs (not routine details). Work continues without answers where noted.

## 1. Gemini API Key (blocks live AI extraction/verification)
- Why needed: `lib/ai/gemini.ts` reads `GEMINI_API_KEY`; empty = AI extraction fails; OCR relies on it.
- Feature unlocked: structured extraction (`structured-extractor.ts`), image OCR (`ocr.ts`), evidence verification.
- Free/no-key alternative: Yes — rule-based extraction works (pipeline implemented); AI verification falls back to inconclusive evidence.
- How to configure: Add to `.env.local`: `GEMINI_API_KEY=your_key` (restart dev server after).
- Can work continue? Yes. All features have rule-based fallbacks; no fabricated results.

## 2. Facebook Developer Credentials (blocks full Facebook discovery)
- Why needed: Graph API requires verified app + `FACEBOOK_APP_ID` / `APP_SECRET` / access token.
- Feature unlocked: structured Facebook opportunity extraction beyond public-page fetch boundary.
- Free alternative: Partial — permitted public access works via `facebook-boundary.ts`; no private/group data.
- How to configure: Create Facebook Developer App, request `pages_read_engagement` / `public_profile`, add token to `.env.local`.
- Can work continue? Yes. Adapter reports limitation honestly; other sources (website, RSS) work.

## 3. Official OpportunityHub Profile / Auth UUID (unblocks full publish workflow)
- Why needed: `approveCandidate()` requires `profiles.publisher_type = 'official'`. Schema supports it; no fabricated profile inserted.
- Feature unlocked: approved candidates publish under official OpportunityHub identity.
- Free alternative: Yes — insert actual user into `auth.users` + `profiles` with `publisher_type = 'official'`.
- How to configure: Create profile in Supabase Auth, then `INSERT INTO profiles (id, email, account_type, publisher_type) VALUES (...)`. Do NOT invent UUIDs.
- Can work continue? Yes. Pipeline leaves candidates unpublished (`status = 'new'`); admin approval path intact.

## 4. Search Provider Key (optional for source adapter)
- Why needed: Only if a search-based adapter requires a commercial API (current `search-adapter` uses basic fetch; no key required by design).
- Feature unlocked: Enhanced search discovery.
- Free alternative: Basic fetch adapter works without key.
- How to configure: If using enhanced provider, set `SEARCH_API_KEY` in `.env.local`.
- Can work continue? Yes.

## 5. Schedule / Scheduler Config (unblocks automated scan scheduling)
- Why needed: `scan-runner.ts` + `discovery_jobs` exist; no cron registered.
- Feature unlocked: recurring automated discovery scans.
- Free alternative: Manual trigger via `POST /api/discovery/scan`; or add cron job with existing `CRON_SECRET`.
- How to configure: Set up Vercel Cron, or server cron: `0 9 * * * curl -X POST ... -H "Authorization: Bearer $CRON_SECRET"`.
- Can work continue? Yes. Manual scan endpoint works.

## 6. Confirm Database Migration Authorization (before production deployment)
- Why needed: Additive SQL (`migration-discovery-automated-scan-jobs.sql`) is safe; destructive changes to production require authorization.
- Feature unlocked: None blocked — migrations are non-destructive indexes.
- How to configure: Confirm with database admin before applying in production.
- Can work continue? Yes. Migration is purely additive (`CREATE INDEX IF NOT EXISTS`).
