-- =============================================================================
-- OpportunityHub — COMPLETE Supabase schema (paste into SQL Editor → Run)
-- Single source of truth containing all tables, constraints, functions, and RLS policies.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  account_type text not null default 'student' check (account_type in ('student', 'school', 'organization')),
  organization_name text,
  school_code text unique,
  school_id uuid references public.profiles (id) on delete set null,
  contact_info text,
  organization_description text,
  students_invite_only boolean not null default false,
  education_level text,
  dream_universities text,
  subjects text,
  interests text,
  career_interests text,
  awards text,
  volunteer_work text,
  leadership_roles text,
  projects text,
  email_reminders boolean not null default true,
  newsletter_subscribed boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email_reminders boolean not null default true,
  add column if not exists newsletter_subscribed boolean not null default true;

comment on table public.profiles is 'One row per auth user; created on signup';

create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists profiles_account_type_idx on public.profiles (account_type);

alter table public.profiles enable row level security;

-- Helper functions with SECURITY DEFINER (bypasses RLS to avoid recursion)
create or replace function public.get_profile_account_type(user_uuid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select account_type from public.profiles where id = user_uuid;
$$;

create or replace function public.is_school(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_uuid and account_type = 'school'
  );
$$;

create or replace function public.can_manage_opportunities(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_uuid and account_type in ('school', 'organization')
  );
$$;

create or replace function public.get_student_school_id(student_uuid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select school_id from public.profiles where id = student_uuid;
$$;

create or replace function public.is_school_of_student(school_uuid uuid, student_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = student_uuid and school_id = school_uuid
  );
$$;

grant execute on function public.get_profile_account_type(uuid) to anon, authenticated, service_role;
grant execute on function public.is_school(uuid) to anon, authenticated, service_role;
grant execute on function public.can_manage_opportunities(uuid) to anon, authenticated, service_role;
grant execute on function public.get_student_school_id(uuid) to anon, authenticated, service_role;
grant execute on function public.is_school_of_student(uuid, uuid) to anon, authenticated, service_role;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Schools can view linked student profiles" on public.profiles;
drop policy if exists "Users and linked schools can view profiles" on public.profiles;

create policy "Users and linked schools can view profiles"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or (
      school_id = auth.uid()
      and public.is_school(auth.uid())
    )
    or (
      id = public.get_student_school_id(auth.uid())
    )
  );

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent unauthorized privilege escalation
create or replace function public.protect_profile_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.account_type is not null and new.account_type is distinct from old.account_type then
    raise exception 'account_type cannot be changed';
  end if;

  if old.school_code is not null and new.school_code is distinct from old.school_code then
    raise exception 'school_code cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_immutable_fields on public.profiles;
create trigger trg_protect_profile_immutable_fields
  before update on public.profiles
  for each row execute function public.protect_profile_immutable_fields();

-- Auto-create profile trigger on signup (handles email confirm delays & default school codes)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_type_val text;
  school_code_val text;
  meta_school_id text;
  school_id_val uuid;
begin
  account_type_val := coalesce(new.raw_user_meta_data->>'account_type', 'student');
  
  if account_type_val = 'school' then
    school_code_val := coalesce(
      new.raw_user_meta_data->>'school_code',
      upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    );
  else
    school_code_val := null;
  end if;

  meta_school_id := new.raw_user_meta_data->>'school_id';
  if meta_school_id is not null and meta_school_id != '' then
    begin
      school_id_val := meta_school_id::uuid;
    exception when others then
      school_id_val := null;
    end;
  else
    school_id_val := null;
  end if;

  insert into public.profiles (
    id,
    email,
    account_type,
    organization_name,
    education_level,
    dream_universities,
    school_id,
    school_code
  )
  values (
    new.id,
    coalesce(new.email, ''),
    account_type_val,
    new.raw_user_meta_data->>'organization_name',
    new.raw_user_meta_data->>'education_level',
    new.raw_user_meta_data->>'dream_universities',
    school_id_val,
    school_code_val
  )
  on conflict (id) do update set
    email = excluded.email,
    account_type = coalesce(public.profiles.account_type, excluded.account_type),
    organization_name = coalesce(excluded.organization_name, public.profiles.organization_name),
    education_level = coalesce(excluded.education_level, public.profiles.education_level),
    dream_universities = coalesce(excluded.dream_universities, public.profiles.dream_universities),
    school_id = coalesce(public.profiles.school_id, excluded.school_id),
    school_code = coalesce(public.profiles.school_code, excluded.school_code);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC for public school code lookup during signup
create or replace function public.resolve_school_by_code(lookup_code text)
returns table (school_id uuid, school_name text, students_invite_only boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := upper(trim(coalesce(lookup_code, '')));
  if normalized = '' then
    return;
  end if;

  return query
  select p.id, p.organization_name, coalesce(p.students_invite_only, false)
  from public.profiles p
  where p.account_type = 'school'
    and p.school_code = normalized;
end;
$$;

grant execute on function public.resolve_school_by_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. school_invite_codes
-- ---------------------------------------------------------------------------

create table if not exists public.school_invite_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique,
  label text,
  max_uses int not null default 1 check (max_uses > 0),
  use_count int not null default 0 check (use_count >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint school_invite_use_count_check check (use_count <= max_uses)
);

create index if not exists school_invite_codes_school_id_idx
  on public.school_invite_codes (school_id);

alter table public.school_invite_codes enable row level security;

drop policy if exists "Schools manage own invite codes" on public.school_invite_codes;
create policy "Schools manage own invite codes"
  on public.school_invite_codes for all
  to authenticated
  using (
    school_id = auth.uid()
    and public.is_school(auth.uid())
  )
  with check (
    school_id = auth.uid()
    and public.is_school(auth.uid())
  );

create or replace function public.validate_school_invite(invite_code text)
returns table (school_id uuid, school_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := upper(trim(coalesce(invite_code, '')));
  if normalized = '' then
    return;
  end if;

  return query
  select p.id, p.organization_name
  from public.school_invite_codes ic
  join public.profiles p on p.id = ic.school_id and p.account_type = 'school'
  where ic.code = normalized
    and ic.active = true
    and ic.use_count < ic.max_uses
    and (ic.expires_at is null or ic.expires_at > now());
end;
$$;

create or replace function public.redeem_school_invite(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  updated int;
begin
  normalized := upper(trim(coalesce(invite_code, '')));
  if normalized = '' then
    return false;
  end if;

  update public.school_invite_codes
  set use_count = use_count + 1
  where code = normalized
    and active = true
    and use_count < max_uses
    and (expires_at is null or expires_at > now());

  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

grant execute on function public.validate_school_invite(text) to anon, authenticated;
grant execute on function public.redeem_school_invite(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. opportunities
-- ---------------------------------------------------------------------------

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  description text not null,
  organizer text,
  registration_link text,
  deadline date,
  start_date date,
  end_date date,
  location text,
  is_online boolean not null default false,
  subject_area text,
  grade_requirements text,
  cost text,
  time_commitment text,
  skills_gained text,
  difficulty_level text,
  tags text[] not null default '{}',
  prep_resources text,
  application_steps text,
  eligibility_details text,
  contact_info text,
  ai_summary text,
  portfolio_tips text,
  ai_enriched_at timestamptz,
  source_url text,
  is_verified boolean not null default false,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'rejected')),
  source_type text not null default 'scraped' check (source_type in ('official', 'scraped', 'ocr', 'manual')),
  raw_source_text text,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.opportunities
  add column if not exists is_verified boolean not null default false,
  add column if not exists verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'rejected')),
  add column if not exists source_type text not null default 'scraped' check (source_type in ('official', 'scraped', 'ocr', 'manual')),
  add column if not exists raw_source_text text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users (id) on delete set null;

alter table public.opportunities enable row level security;

create index if not exists opportunities_created_at_idx
  on public.opportunities (created_at desc);

create index if not exists opportunities_created_by_idx
  on public.opportunities (created_by);

create index if not exists opportunities_subject_area_idx
  on public.opportunities (subject_area);

create index if not exists opportunities_type_idx
  on public.opportunities (type);

create index if not exists opportunities_deadline_idx
  on public.opportunities (deadline);

create index if not exists opportunities_verification_status_idx
  on public.opportunities (verification_status);

create index if not exists opportunities_is_verified_idx
  on public.opportunities (is_verified);

drop policy if exists "Authenticated users can view opportunities" on public.opportunities;
drop policy if exists "Anyone can view opportunities" on public.opportunities;
create policy "Anyone can view opportunities"
  on public.opportunities for select
  to anon, authenticated
  using (true);

drop policy if exists "Schools and orgs can create opportunities" on public.opportunities;
create policy "Schools and orgs can create opportunities"
  on public.opportunities for insert
  to authenticated
  with check (
    public.can_manage_opportunities(auth.uid())
  );

drop policy if exists "Authenticated users can enrich opportunities" on public.opportunities;
drop policy if exists "Creators can update opportunities" on public.opportunities;
create policy "Creators can update opportunities"
  on public.opportunities for update
  to authenticated
  using (
    auth.uid() = created_by
    or (
      created_by is null
      and public.can_manage_opportunities(auth.uid())
    )
  )
  with check (
    auth.uid() = created_by
    or (
      created_by is null
      and public.can_manage_opportunities(auth.uid())
    )
  );

create or replace function public.verify_opportunity(opp_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_opportunities(caller_id) then
    raise exception 'Unauthorized: Only schools or organizations can verify opportunities';
  end if;

  update public.opportunities
  set
    is_verified = true,
    verification_status = 'verified',
    verified_at = now(),
    verified_by = caller_id
  where id = opp_id
    and (
      created_by is null
      or created_by = caller_id
    );

  if not found then
    raise exception 'Cannot verify: listing not found or you are not the publisher';
  end if;

  return true;
end;
$$;

create or replace function public.reject_opportunity(opp_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_opportunities(caller_id) then
    raise exception 'Unauthorized: Only schools or organizations can reject opportunities';
  end if;

  update public.opportunities
  set
    is_verified = false,
    verification_status = 'rejected'
  where id = opp_id
    and (
      created_by is null
      or created_by = caller_id
    );

  if not found then
    raise exception 'Cannot reject: listing not found or you are not the publisher';
  end if;

  return true;
end;
$$;

grant execute on function public.verify_opportunity(uuid) to authenticated;
grant execute on function public.reject_opportunity(uuid) to authenticated;

create or replace function public.save_opportunity_ai_enrichment(
  opp_id uuid,
  patch jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.opportunities%rowtype;
  k text;
  allowed text[] := array[
    'ai_summary',
    'prep_resources',
    'application_steps',
    'eligibility_details',
    'contact_info',
    'portfolio_tips',
    'ai_enriched_at',
    'source_url',
    'tags',
    'deadline',
    'start_date',
    'end_date',
    'cost',
    'time_commitment',
    'location',
    'grade_requirements',
    'skills_gained',
    'difficulty_level'
  ];
  key_allowed boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into o from public.opportunities where id = opp_id;
  if not found then
    raise exception 'Opportunity not found';
  end if;

  if patch is null or patch = '{}'::jsonb then
    return false;
  end if;

  for k in select jsonb_object_keys(patch)
  loop
    key_allowed := k = any(allowed);
    if not key_allowed then
      continue;
    end if;

    case k
      when 'ai_summary' then
        o.ai_summary := nullif(trim(both from patch->>'ai_summary'), '');
      when 'prep_resources' then
        o.prep_resources := nullif(trim(both from patch->>'prep_resources'), '');
      when 'application_steps' then
        o.application_steps := nullif(trim(both from patch->>'application_steps'), '');
      when 'eligibility_details' then
        o.eligibility_details := nullif(trim(both from patch->>'eligibility_details'), '');
      when 'contact_info' then
        o.contact_info := nullif(trim(both from patch->>'contact_info'), '');
      when 'portfolio_tips' then
        o.portfolio_tips := nullif(trim(both from patch->>'portfolio_tips'), '');
      when 'ai_enriched_at' then
        o.ai_enriched_at := (patch->>'ai_enriched_at')::timestamptz;
      when 'source_url' then
        o.source_url := nullif(trim(both from patch->>'source_url'), '');
      when 'tags' then
        if jsonb_typeof(patch->'tags') = 'array' then
          o.tags := array(
            select jsonb_array_elements_text(patch->'tags')
          );
        end if;
      when 'deadline' then
        o.deadline := nullif(patch->>'deadline', '')::date;
      when 'start_date' then
        o.start_date := nullif(patch->>'start_date', '')::date;
      when 'end_date' then
        o.end_date := nullif(patch->>'end_date', '')::date;
      when 'cost' then
        o.cost := nullif(trim(both from patch->>'cost'), '');
      when 'time_commitment' then
        o.time_commitment := nullif(trim(both from patch->>'time_commitment'), '');
      when 'location' then
        o.location := nullif(trim(both from patch->>'location'), '');
      when 'grade_requirements' then
        o.grade_requirements := nullif(trim(both from patch->>'grade_requirements'), '');
      when 'skills_gained' then
        o.skills_gained := nullif(trim(both from patch->>'skills_gained'), '');
      when 'difficulty_level' then
        o.difficulty_level := nullif(trim(both from patch->>'difficulty_level'), '');
      else
        null;
    end case;
  end loop;

  update public.opportunities
  set
    ai_summary = o.ai_summary,
    prep_resources = o.prep_resources,
    application_steps = o.application_steps,
    eligibility_details = o.eligibility_details,
    contact_info = o.contact_info,
    portfolio_tips = o.portfolio_tips,
    ai_enriched_at = o.ai_enriched_at,
    source_url = o.source_url,
    tags = o.tags,
    deadline = o.deadline,
    start_date = o.start_date,
    end_date = o.end_date,
    cost = o.cost,
    time_commitment = o.time_commitment,
    location = o.location,
    grade_requirements = o.grade_requirements,
    skills_gained = o.skills_gained,
    difficulty_level = o.difficulty_level
  where id = opp_id;

  return true;
end;
$$;

grant execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) to authenticated;

drop policy if exists "Creators can delete opportunities" on public.opportunities;
create policy "Creators can delete opportunities"
  on public.opportunities for delete
  to authenticated
  using (
    auth.uid() = created_by
  );

-- ---------------------------------------------------------------------------
-- 4. saved_opportunities
-- ---------------------------------------------------------------------------

create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  remind_deadline boolean not null default true,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint saved_opportunities_user_opportunity_unique unique (user_id, opportunity_id)
);

alter table public.saved_opportunities
  add column if not exists remind_deadline boolean not null default true,
  add column if not exists reminder_sent_at timestamptz;

alter table public.saved_opportunities enable row level security;

drop policy if exists "Users can view own saved opportunities" on public.saved_opportunities;
create policy "Users can view own saved opportunities"
  on public.saved_opportunities for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save opportunities" on public.saved_opportunities;
create policy "Users can save opportunities"
  on public.saved_opportunities for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own saved opportunities" on public.saved_opportunities;
create policy "Users can update own saved opportunities"
  on public.saved_opportunities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can unsave opportunities" on public.saved_opportunities;
create policy "Users can unsave opportunities"
  on public.saved_opportunities for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists saved_opportunities_user_id_idx
  on public.saved_opportunities (user_id);

create index if not exists saved_opportunities_opportunity_id_idx
  on public.saved_opportunities (opportunity_id);

-- ---------------------------------------------------------------------------
-- 5. activities
-- ---------------------------------------------------------------------------

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

drop policy if exists "Users can view own activities" on public.activities;
create policy "Users can view own activities"
  on public.activities for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Schools can view linked student activities" on public.activities;
drop policy if exists "Users and linked schools can view activities" on public.activities;
create policy "Users and linked schools can view activities"
  on public.activities for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      public.is_school(auth.uid())
      and public.is_school_of_student(auth.uid(), activities.user_id)
    )
  );

drop policy if exists "Users can insert own activities" on public.activities;
create policy "Users can insert own activities"
  on public.activities for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own activities" on public.activities;
create policy "Users can update own activities"
  on public.activities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own activities" on public.activities;
create policy "Users can delete own activities"
  on public.activities for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists activities_user_id_idx
  on public.activities (user_id);

create index if not exists activities_date_idx
  on public.activities (date desc);

create index if not exists activities_created_at_idx
  on public.activities (created_at desc);

-- ---------------------------------------------------------------------------
-- 6. ai_user_usage
-- ---------------------------------------------------------------------------

create table if not exists public.ai_user_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  premium_used int not null default 0 check (premium_used >= 0),
  standard_used int not null default 0 check (standard_used >= 0),
  basic_used int not null default 0 check (basic_used >= 0),
  reset_month text not null default to_char(timezone('utc', now()), 'YYYY-MM'),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.ai_user_usage enable row level security;

create policy "Users read own AI usage"
  on public.ai_user_usage for select
  using (auth.uid() = user_id);

create policy "Users insert own AI usage"
  on public.ai_user_usage for insert
  with check (auth.uid() = user_id);

create policy "Users update own AI usage"
  on public.ai_user_usage for update
  using (auth.uid() = user_id);

-- Prevent duplicate accounts by email
create or replace function public.check_email_exists(lookup_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  cleaned text;
begin
  if lookup_email is null or trim(lookup_email) = '' then
    return false;
  end if;

  cleaned := lower(trim(lookup_email));

  return exists (
    select 1 from auth.users
    where lower(email) = cleaned
  ) or exists (
    select 1 from public.profiles
    where lower(email) = cleaned
  );
end;
$$;

grant execute on function public.check_email_exists(text) to anon, authenticated, service_role;

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Grants & Reload
-- ---------------------------------------------------------------------------

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant all on all sequences in schema public to postgres, authenticated, service_role;

notify pgrst, 'reload schema';

-- =============================================================================
-- Migration: Community Q&A, Participant Reviews, Onboarding, Follows & Editions
-- Run in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. Profiles additions for onboarding and study goals
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists intended_major text;

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

