-- =============================================================================
-- Migration: Community Q&A, Participant Reviews, Onboarding, Follows & Editions
-- Run in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. Profiles additions for onboarding and study goals
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists intended_major text;

-- Existing students skip the wizard; new signups remain onboarding_completed = false
update public.profiles
set onboarding_completed = true
where account_type = 'student'
  and onboarding_completed = false;

-- 2. Link portfolio activities directly to OpportunityHub opportunities
alter table public.activities
  add column if not exists opportunity_id uuid references public.opportunities (id) on delete set null;

create index if not exists activities_opportunity_id_idx on public.activities (opportunity_id);

-- 3. Recurring opportunity editions
alter table public.opportunities
  add column if not exists parent_opportunity_id uuid references public.opportunities (id) on delete set null,
  add column if not exists edition_year text;

create index if not exists opportunities_parent_id_idx on public.opportunities (parent_opportunity_id);

-- 4. Community Q&A and Discussions
create table if not exists public.opportunity_comments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  parent_id uuid references public.opportunity_comments (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists opportunity_comments_opp_idx on public.opportunity_comments (opportunity_id, created_at desc);
create index if not exists opportunity_comments_user_idx on public.opportunity_comments (user_id);
create index if not exists opportunity_comments_parent_idx on public.opportunity_comments (parent_id);

alter table public.opportunity_comments enable row level security;

drop policy if exists "Anyone can read comments" on public.opportunity_comments;
create policy "Anyone can read comments"
  on public.opportunity_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can post comments" on public.opportunity_comments;
create policy "Authenticated users can post comments"
  on public.opportunity_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.opportunity_comments;
create policy "Users can delete own comments"
  on public.opportunity_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- 5. Participant Experiences & Tips (Community Knowledge)
create table if not exists public.opportunity_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  difficulty_rating text check (difficulty_rating in ('Beginner', 'Intermediate', 'Advanced', 'Challenging')),
  prep_tips text not null check (char_length(trim(prep_tips)) > 0),
  common_mistakes text,
  skills_developed text,
  verified_participant boolean not null default false,
  created_at timestamptz not null default now(),
  constraint opportunity_reviews_user_unique unique (opportunity_id, user_id)
);

create index if not exists opportunity_reviews_opp_idx on public.opportunity_reviews (opportunity_id);
create index if not exists opportunity_reviews_user_idx on public.opportunity_reviews (user_id);

alter table public.opportunity_reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.opportunity_reviews;
create policy "Anyone can read reviews"
  on public.opportunity_reviews for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can submit review" on public.opportunity_reviews;
create policy "Authenticated users can submit review"
  on public.opportunity_reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own review" on public.opportunity_reviews;
create policy "Users can update own review"
  on public.opportunity_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own review" on public.opportunity_reviews;
create policy "Users can delete own review"
  on public.opportunity_reviews for delete
  to authenticated
  using (auth.uid() = user_id);

-- 6. Following Schools and Organizations
create table if not exists public.organization_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint organization_follows_user_org_unique unique (user_id, organization_id)
);

create index if not exists organization_follows_user_idx on public.organization_follows (user_id);
create index if not exists organization_follows_org_idx on public.organization_follows (organization_id);

alter table public.organization_follows enable row level security;

drop policy if exists "Users can view follows" on public.organization_follows;
create policy "Users can view follows"
  on public.organization_follows for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can follow orgs" on public.organization_follows;
create policy "Users can follow orgs"
  on public.organization_follows for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can unfollow orgs" on public.organization_follows;
create policy "Users can unfollow orgs"
  on public.organization_follows for delete
  to authenticated
  using (auth.uid() = user_id);

-- 7. View public profiles of schools & organizations
drop policy if exists "Anyone can view schools and organizations" on public.profiles;
create policy "Anyone can view schools and organizations"
  on public.profiles for select
  to anon, authenticated
  using (account_type in ('school', 'organization'));

-- 8. Reload schema cache
notify pgrst, 'reload schema';
