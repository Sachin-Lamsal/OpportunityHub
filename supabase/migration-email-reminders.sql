-- =============================================================================
-- Migration: Add Deadline Reminder & Newsletter Preferences
-- Run in Supabase SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. Add reminder columns to saved_opportunities
alter table public.saved_opportunities
  add column if not exists remind_deadline boolean not null default true,
  add column if not exists reminder_sent_at timestamptz;

-- 2. Add email notification preferences to profiles
alter table public.profiles
  add column if not exists email_reminders boolean not null default true,
  add column if not exists newsletter_subscribed boolean not null default true;

-- 3. Allow authenticated users to update their own saved opportunities (for reminder toggling)
drop policy if exists "Users can update own saved opportunities" on public.saved_opportunities;
create policy "Users can update own saved opportunities"
  on public.saved_opportunities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Reload schema cache
notify pgrst, 'reload schema';
