-- =============================================================================
-- OpportunityHub — MASTER SETUP (Schema + All Opportunities Seed Merged)
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, and UPSERT on title.
-- =============================================================================

-- =============================================================================
-- PART 1: DATABASE SCHEMA, CONSTRAINTS, RPCS, AND RLS POLICIES
-- =============================================================================

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

-- SECURITY: SECURITY DEFINER bypasses RLS. AI-derived narrative may be written
-- by any signed-in user (the "Generate AI details" feature); publisher-owned
-- facts may only be written by the publisher who created the listing (or an
-- administrator). Migration-ai-enrichment-authorization.sql contains the same
-- definition for databases created before this hardening.
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
  -- Columns that describe the listing itself. Only the publisher who created
  -- the listing (or an administrator) may change them.
  owner_only text[] := array[
    'contact_info',
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
  is_owner boolean;
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

  is_owner := (o.created_by is not null and o.created_by = uid)
              or public.is_admin(uid);

  for k in select jsonb_object_keys(patch)
  loop
    key_allowed := k = any(allowed);
    if not key_allowed then
      continue;
    end if;

    -- AI-derived narrative stays open to any signed-in user; publisher facts
    -- require ownership. Rows with a NULL created_by have no owner, so only an
    -- administrator may change their facts.
    if k = any(owner_only) and not is_owner then
      raise exception 'Only the publisher who created this listing can change %', k;
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

revoke execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) from public;
grant execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) to authenticated, service_role;

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

drop policy if exists "Users read own AI usage" on public.ai_user_usage;
create policy "Users read own AI usage"
  on public.ai_user_usage for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own AI usage" on public.ai_user_usage;
create policy "Users insert own AI usage"
  on public.ai_user_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own AI usage" on public.ai_user_usage;
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
-- PART 2: INTEGRATED OPPORTUNITIES SEED DATA (GROUPS A, B, AND C)
-- =============================================================================

-- =============================================================================
-- OpportunityHub — INTEGRATED opportunities seed
-- This master setup file includes the schema and all opportunity data.
--
-- Safe to re-run and safe on a database that already ran parts 1-3: rows are
-- upserted by title (existing rows are updated in place, so saved_opportunities
-- links are kept). ai_summary, portfolio_tips and ai_enriched_at are never touched.
--
-- Status of each row (also written into eligibility_details where it matters):
--   VERIFIED      checked against an official or primary page on Oct 10-11, 2026
--   THIN          taken from an aggregator summary; official notice not read
--   LISTING-ONLY  YatraMap listing data; not checked against the official site
-- Run check-links.py on this file to test every URL from your own machine.
-- =============================================================================

-- 1) Remove old sample rows and rows that do not apply to Nepali students
--    (saved_opportunities rows that point at them go with them, by cascade).
delete from public.opportunities
where registration_link like 'https://example.com/%'
   or title in (
     'Math Kangaroo 2027',
     'International Chemistry Olympiad (IChO) - Nepal Team Selection'
   );

-- 2) One row was renamed after checking: keep its id (and any saves).
update public.opportunities
set title = 'Japan Resource Center (JRC) - Embassy of Japan, Kathmandu'
where title = 'Japan Information Center Kathmandu';

-- 3) Titles must be unique so rows can be upserted by title.
create unique index if not exists opportunities_title_key
  on public.opportunities (title);

-- =============================================================================
-- 4) FULL-DETAIL ROWS, group A (government/university, olympiads, Nepal programs)
-- =============================================================================

insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
select
  title, type, description, organizer, registration_link, deadline::date,
  start_date::date, end_date::date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags::text[], prep_resources, application_steps,
  eligibility_details, contact_info, source_url
from (values

  -- VERIFIED: spaceappschallenge.org
  (
    'NASA Space Apps Challenge 2026',
    'Hackathon',
    $$Free two-day global hackathon (theme: The Next Frontier) where individuals and teams use NASA and partner space-agency open data to tackle official challenge statements. Choose an in-person or virtual Local Event (450+ worldwide). Projects submitted by the deadline earn a participation certificate and can enter Global Judging.$$,
    'NASA',
    'https://www.spaceappschallenge.org/2026/',
    '2026-11-15',
    '2026-11-14',
    '2026-11-15',
    'Online or local events worldwide',
    true,
    'Technology',
    'All ages and skill levels',
    'Free',
    '2-day hackathon plus team setup beforehand',
    'Data analysis, coding, teamwork, problem solving, presentation',
    'Beginner',
    array['hackathon','NASA','space','coding','free','online'],
    $$Challenge summaries released Sept 17, 2026; full challenge statements released Oct 28, 2026. NASA open-data links are on the official site.$$,
    $$1) Create a NASA Space Apps account. 2) Register for the 2026 hackathon (open until Nov 15). 3) Choose an in-person or virtual Local Event (can be changed until Nov 15). 4) Join or form a team. 5) Work on a challenge Nov 14-15 and submit your project by Nov 15. 6) Complete the participant survey by Nov 30.$$,
    $$Open worldwide to all ages and skill levels; free. Teams of up to six. Project submission opens Sat Nov 14 at 9:00 AM and closes Sun Nov 15 at 11:59 PM local time; registration closes Nov 15. Every participant who submits a project receives a participation certificate. Register and pick a Local Event (in person or virtual) or the virtual Universal Event.$$,
    $$Official site: https://www.spaceappschallenge.org/2026/$$,
    'https://yatramap.codeyatranp.com/opportunities/nasa-space-apps-challenge-2026-global-hackathon'
  ),

  -- VERIFIED: cliburn.org
  (
    'Cliburn International Competition for Young Pianists 2027',
    'Competition',
    $$Piano competition for ages 13-17. The Cliburn selects 38 Piano Fellows for an in-residence fellowship at SMU (masterclasses, workshops, performances); 24 of them compete for prizes and finalists perform with the Dallas Symphony Orchestra.$$,
    'The Cliburn',
    'https://cliburn.org/competitions/2027-young-pianists/application-and-rules',
    '2026-11-17',
    '2027-06-10',
    '2027-06-19',
    'Dallas, Texas, USA (SMU)',
    false,
    'Music',
    'Pianists aged 13-17',
    $$USD 125 non-refundable application fee. Selected Piano Fellows are fully funded: housing, meals, transport and one economy round-trip ticket to Dallas.$$,
    'Fellowship begins June 7, 2027; competition June 10-19, 2027',
    'Performance, repertoire preparation, masterclass experience',
    'Advanced',
    array['music','piano','competition','international'],
    $$Repertoire requirements are in the official rules; no changes to submitted repertoire are accepted after Feb 23, 2027.$$,
    $$1) Read the application and rules page. 2) Apply through the Cliburn's online system (app.getacceptd.com/cliburnyp) and pay the USD 125 fee by 11:59 p.m. CST (GMT-6) on Nov 17, 2026; no late applications. 3) Upload a 15-20 minute unedited video (one virtuosic etude, one Classical sonata movement, one slow lyrical work) filmed within six months of submission. 4) Notification Jan 26, 2027; Piano Fellows announced Feb 9, 2027; repertoire changes close Feb 23, 2027.$$,
    $$Open to pianists of all nationalities born after June 19, 2009 and on or before June 7, 2014. Previous first-prize winners of this competition are not eligible. Selected fellows must be in residence on the SMU campus June 7-20, 2027 and join every fellowship activity. Fellows outside the US arrange their own visas; the Cliburn helps after acceptance.$$,
    $$Eli Miller, emiller@cliburn.org, +1 817 738 6536$$,
    'https://yatramap.codeyatranp.com/opportunities/cliburn-international-competition-young-pianists-2027'
  ),

  -- PARTLY VERIFIED: past YIRA cycles checked; 2027 dates not published
  (
    'YIRA Global Essay Competition 2027 (Yale)',
    'Competition',
    $$Write an essay of about 400 words on a global issue and get feedback from Yale students. Open to students in grades 8-12 worldwide. Finalist essays are judged by Yale students, and all participants receive certificates from YIRA and Learn with Leaders.$$,
    'Yale International Relations Association (YIRA)',
    'https://www.yira.org/',
    null,
    null,
    null,
    'Online',
    true,
    'Social Studies',
    'Grades 8-12',
    $$Registration fee (USD 25 in the 2024-25 cycle; 2027 fee not confirmed)$$,
    'About 400 words plus optional January webinars',
    'Writing, research, global awareness, critical thinking',
    'Intermediate',
    array['essay','international relations','writing','global issues','online'],
    $$In the 2025-26 cycle YIRA ran free January webinars on global issues and essay writing; essays were submitted in early February and finalists announced in March.$$,
    $$Register on the YIRA competition site before the registration deadline, attend the optional January webinars, then submit your ~400-word essay in the early-February window (timeline based on previous cycles).$$,
    $$Grades 8-12 worldwide. The 2027 dates are not published yet. Earlier cycles: registration closed Dec 31, 2024 (2025 edition) and Jan 8, 2026 (2026 edition; early deadline Jan 6), with essays submitted in early February. Treat any December date you see elsewhere as provisional and re-check yira.org.$$,
    null,
    'https://yatramap.codeyatranp.com/opportunities/yira-global-essay-competition-2027-yale-high-school'
  ),

  -- VERIFIED: indembkathmandu.gov.in/mgss (page updated Oct 11, 2026)
  (
    'Mahatma Gandhi Scholarship Scheme (MGSS) - Class 11',
    'Scholarship',
    $$Embassy of India scholarship for Nepali Class 11 students: NPR 24,000 per year for two years (Class 11 and Class 12). The Class 12 instalment continues only after you submit your Class 11 result and a status letter.$$,
    'Embassy of India, Kathmandu',
    'https://www.indembkathmandu.gov.in/mgss',
    null,
    null,
    null,
    'Nepal (nationwide)',
    false,
    'Education',
    'Class 11 (not Diploma) at a recognized institute in Nepal',
    'No application fee',
    'Online application plus document uploads',
    null,
    'Intermediate',
    array['scholarship','nepal','class 11','+2','embassy of india'],
    null,
    $$Apply online on goischolarship.com.np when the portal opens (it only works while the scheme is open). Upload: passport photo, notarized citizenship certificate of you or your parents, Class 10 mark sheet, an attested letter from your principal confirming you study in Class 11, income proof issued by the local authority (LDO/CDO), and a disability certificate if applicable. Printouts are not needed. If selected you receive NPR 24,000 a year; for the second year send your Class 11 mark sheet and a Class 12 status certificate by 31 December to the Embassy Education Wing or attacheedu.kathmandu@mea.gov.in. Apply yourself only: the Embassy does not accept applications through agents or consultants.$$,
    $$Nepali citizen and regular Class 11 student at a recognized institute in Nepal, with at least 60% aggregate marks in Class 10, family income below NPR 200,000 a year, and no other scholarship. The Embassy page says the scheme normally opens in October/November on the online portal. The 2026-27 notice was not posted when checked on Oct 11, 2026, so no deadline is confirmed. Past cycles: 2024-25 closed Nov 29, 2024 after an extension; 2025-26 opened Oct 6, 2025, was due Nov 2 and was extended to Nov 20, 2025.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://yatramap.codeyatranp.com/opportunities/mahatma-gandhi-scholarship-nepal-2026'
  ),

  -- VERIFIED: Embassy of India notices (2025-26 cycle is the latest found)
  (
    'Golden Jubilee Scholarship Scheme (GJSS) - First-Year Undergraduate',
    'Scholarship',
    $$Embassy of India scholarship for Nepali students starting bachelor-level courses (including MBBS and engineering). The scholarship runs 3, 4 or 5 years depending on the course.$$,
    'Embassy of India, Kathmandu',
    'https://www.indembkathmandu.gov.in/',
    null,
    null,
    null,
    'Nepal (nationwide)',
    false,
    'Education',
    'Class 12 graduates entering a bachelor-level course in Nepal',
    'No application fee',
    'Online application plus document uploads',
    null,
    'Intermediate',
    array['scholarship','nepal','undergraduate','embassy of india','MBBS','engineering'],
    null,
    $$Apply online through the Embassy web portal and upload your Class 12 mark sheet and proof of Nepali citizenship; follow the Embassy notice for admission and enrolment documents.$$,
    $$Nepali citizen studying in Nepal with at least 70% aggregate marks in Class 12 (excluding Class 11), aged 17 to 22 as of 1 July 2026. Date note: the 2026-27 notice was not on the Embassy website on Oct 10, 2026, so no deadline is confirmed. Past cycles: 2024-25 closed Nov 29, 2024 after an extension; 2025-26 opened Oct 6, 2025, was due Nov 2 and was extended to Nov 20, 2025.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://yatramap.codeyatranp.com/opportunities/golden-jubilee-scholarship-nepal-2026'
  ),

  -- VERIFIED: University of Toronto dates (YatraMap had the wrong nomination date)
  (
    'Lester B. Pearson International Scholarship 2027 (University of Toronto)',
    'Scholarship',
    $$Four-year, fully funded undergraduate scholarship (tuition, books, incidental fees and full residence support) for about 37 international students entering their first degree at the University of Toronto in September 2027.$$,
    'University of Toronto',
    'https://www.future.utoronto.ca/pearson',
    '2026-11-06',
    null,
    null,
    'University of Toronto, Canada',
    false,
    'Any undergraduate program',
    'Final-year international secondary students graduating in 2027',
    'Fully funded for 4 years',
    'Several application stages, Oct-Nov 2026',
    'Academic excellence, leadership, essay writing',
    'Advanced',
    array['scholarship','canada','undergraduate','fully funded','university of toronto'],
    null,
    $$1) Your school must nominate you through U of T's Pearson nomination system (deadline was Oct 9, 2026). 2) Submit your U of T undergraduate admission application (OUAC) by Oct 16, 2026. 3) Complete the Pearson application through the personalised link U of T sends you, with all documents, by Nov 6, 2026. Recipients are notified from late January 2027.$$,
    $$International student (requiring a study permit) in the final year of secondary school, starting first-entry undergraduate study at U of T in September 2027 with no prior post-secondary enrolment. The school nomination deadline (Oct 9, 2026) has already passed, so only continue if your school has nominated you. YatraMap lists Oct 16 as the nomination deadline; U of T sources show Oct 9 for nomination and Oct 16 for the admission application.$$,
    $$Use the Pearson Scholarship Inquiry Form on https://www.future.utoronto.ca/pearson$$,
    'https://yatramap.codeyatranp.com/opportunities/lester-b-pearson-international-scholarship-2027-toronto-undergraduate'
  ),

  -- VERIFIED: UBC International Scholars Program pages and guides
  (
    'UBC International Scholars Program 2027',
    'Scholarship',
    $$Need-and-merit-based awards for international students entering a first undergraduate degree at UBC (Vancouver or Okanagan). One application covers four awards, including the Karen McKellin International Leader of Tomorrow Award; the value varies by award.$$,
    'University of British Columbia',
    'https://yatramap.codeyatranp.com/opportunities/ubc-international-scholars-program-2027',
    '2026-11-15',
    null,
    null,
    'UBC Vancouver / Okanagan, Canada',
    false,
    'Any undergraduate program',
    'Final-year secondary students applying for September 2027 entry',
    'UBC admission application fee applies',
    'Applications open early Oct 2026; documents due Jan 31, 2027',
    'Leadership, essay writing, academic excellence',
    'Advanced',
    array['scholarship','canada','undergraduate','leadership','UBC'],
    null,
    $$1) Submit your UBC undergraduate admission application and choose your first-choice program. 2) Create your International Scholars application, invite a nominator and a teacher referee, and complete the essays and financial documentation by Nov 15, 2026 (11:59 p.m. Vancouver time). 3) Send supporting documents by Jan 31, 2027. Results come Feb-Apr 2027.$$,
    $$International students entering a first undergraduate degree directly from secondary school (September 2027 intake). Demonstrated financial need is required for all four awards, and not every UBC degree is eligible. The general UBC admission deadline (Jan 15, 2027) is too late for this scholarship.$$,
    $$Official UBC admissions site: https://you.ubc.ca/$$,
    'https://yatramap.codeyatranp.com/opportunities/ubc-international-scholars-program-2027'
  ),

  -- VERIFIED: nepalastronomicalsociety.org (13th NAO, 2026 edition)
  (
    'National Astronomy Olympiad (NAO) - Nepal',
    'Olympiad',
    $$Early-stage talent hunt for secondary school students in Nepal, run by the Nepal Astronomical Society since 2014. Top performers go on to Nepal's teams for international astronomy olympiads (IOAA 2026 in Vietnam, IOAA-junior 2026 in Thailand).$$,
    'Nepal Astronomical Society (NASO)',
    'https://www.nepalastronomicalsociety.org/projects/olympiad/',
    null,
    null,
    null,
    'Provincial exam centres across Nepal (Kathmandu centre in 2026: Herald College, Naxal)',
    false,
    'Science',
    'Classes 8-12 (Junior: classes 8-10; Senior: classes 11-12), ages 13-20',
    'NPR 1,000 (NPR 500 with a ward-office letter) in the 2026 edition',
    'One provincial-round exam day plus preparation',
    'Astronomy, physics reasoning, problem solving',
    'Intermediate',
    array['astronomy','olympiad','nepal','science','physics'],
    null,
    $$1) Fill in the online registration form on the Nepal Astronomical Society site. 2) Pay the fee by the QR code in the form. 3) Sit the provincial round at your assigned centre. In 2026: registration deadline Jan 9, provincial exam Jan 17.$$,
    $$Nepali students in classes 8-12 (Junior 8-10, Senior 11-12), ages 13-20; foreign nationals studying in Nepal are not eligible. The fee is non-refundable. Date note: details above are from the 13th NAO (2026; registration closed Jan 9, 2026; closed camp June 1-7, 2026; 16 students then named to IOAA 2026 in Vietnam, IOAA-junior in Thailand and OWAO in Russia). The 14th edition had not been announced on Oct 11, 2026, so the deadline is blank. Expect registration around the new year.$$,
    $$Via https://www.nepalastronomicalsociety.org/$$,
    'https://www.nepalastronomicalsociety.org/event/13th-nao2026-nepal/'
  ),

  -- VERIFIED: globalgamejam.org pages and program listings
  (
    'Global Game Jam 2027',
    'Hackathon',
    $$Build a game in 48 hours with teammates worldwide at a local jam site or online. The 2027 jam week runs January 25-31; most sites use the weekend inside that week. There is also GGJ NEXT, a jam for ages 12-17. No prizes; the focus is on learning and community.$$,
    'Global Game Jam',
    'https://globalgamejam.org/',
    null,
    '2027-01-25',
    '2027-01-31',
    'Online',
    true,
    'Technology',
    'All ages and experience levels (GGJ NEXT: ages 12-17)',
    'Free',
    null,
    null,
    null,
    array['game design','hackathon','coding','online'],
    null,
    null,
    $$Open worldwide. Jam-site hosts register from Nov 1, 2026; individual jammers can register from Dec 1, 2026 on globalgamejam.org (per program listings; confirm there). Another listing shows a Jan 23-25 weekend, so check your local site's own 48-hour window.$$,
    null,
    'https://yatramap.codeyatranp.com/opportunities/global-game-jam-2027'
  ),

  -- VERIFIED: Embassy of Japan JRC page (this row was called "Japan Information Center Kathmandu")
  (
    'Japan Resource Center (JRC) - Embassy of Japan, Kathmandu',
    'Opportunity',
    $$Embassy of Japan library in Panipokhari, Kathmandu, open to members. Offers reference books, a video library and counseling and guidance on higher studies and scholarships in Japan, plus study-tour programs.$$,
    'Embassy of Japan in Nepal',
    'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00138.html',
    null,
    null,
    null,
    'Embassy of Japan, Panipokhari, Kathmandu',
    false,
    'Study Abroad',
    'Students planning to study in Japan',
    'Membership (check the Embassy page)',
    null,
    null,
    null,
    array['japan','study abroad','MEXT','advising','kathmandu'],
    null,
    null,
    $$Membership is required: bring ID, fill the Embassy form and submit it with photographs and a recommendation from your organization (see the official page for current steps).$$,
    $$jrc-emb@km.mofa.go.jp (Mon-Fri, 9:30 AM-5:00 PM, closed 1:00-2:00 PM)$$,
    'https://yatramap.codeyatranp.com/opportunities/japan-information-center-kathmandu'
  )

) as v(
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
on conflict (title) do update set
  type = excluded.type, description = excluded.description,
  organizer = excluded.organizer, registration_link = excluded.registration_link,
  deadline = excluded.deadline, start_date = excluded.start_date,
  end_date = excluded.end_date, location = excluded.location,
  is_online = excluded.is_online, subject_area = excluded.subject_area,
  grade_requirements = excluded.grade_requirements, cost = excluded.cost,
  time_commitment = excluded.time_commitment, skills_gained = excluded.skills_gained,
  difficulty_level = excluded.difficulty_level, tags = excluded.tags,
  prep_resources = excluded.prep_resources, application_steps = excluded.application_steps,
  eligibility_details = excluded.eligibility_details, contact_info = excluded.contact_info,
  source_url = excluded.source_url;

-- =============================================================================
-- 5) FULL-DETAIL ROWS, group B (government scholarships and entrance routes,
--    sports, international programs, schools and colleges)
-- =============================================================================

insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
select
  title, type, description, organizer, registration_link, deadline::date,
  start_date::date, end_date::date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags::text[], prep_resources, application_steps,
  eligibility_details, contact_info, source_url
from (values

  -- ===== Government, embassy and university scholarships / entrance routes =====

  -- VERIFIED: ekantipur and Kathmandu Metropolitan City notices (2083/84 cycle)
  (
    'Kathmandu Metropolitan City Class 11-12 Scholarship (Institutional Schools)',
    'Scholarship',
    $$Kathmandu Metropolitan City (KMC) places students in the scholarship quota of institutional (private) schools and colleges for Class 11 and 12 through an exam based on the Class 10 curriculum. Selected students pay no tuition fees in Classes 11-12. In 2083/84, 4,857 quota seats were set across 145 institutions in the city, and more than 26,000 students applied.$$,
    'Kathmandu Metropolitan City, Education Department',
    'https://entrance.kathmandu.gov.np/',
    null,
    null,
    null,
    'Kathmandu Metropolitan City, Nepal',
    false,
    'Education',
    'SEE graduates (Class 10) entering Class 11',
    'Free to apply; selected students study fee-free',
    'Online application plus one 2-hour exam',
    null,
    'Intermediate',
    array['scholarship','class 11','+2','kathmandu','metro scholarship','nepal'],
    $$The exam is 100 multiple-choice questions on the Class 10 (secondary level) curriculum, held 8-10 AM; the pass mark has been 40%. KMC publishes past question papers on its entrance portal.$$,
    $$1) Watch for the KMC notice around Baisakh-Jestha (the 2083/84 notice opened Jestha 1, 2083). 2) Apply online at entrance.kathmandu.gov.np with your SEE grade sheet, citizenship or birth certificate and the school or ward recommendation the notice asks for. 3) Print your admit card two days before and sit the exam (2083/84: Jestha 17, 8-10 AM). 4) After the merit list, choose subjects and schools in order of priority; leftover seats went to a final "wrap-up" round (re-application closed Ashad 8, 2083).$$,
    $$Date note: the 2083/84 cycle is finished (applications Jestha 1-10, 2083; exam Jestha 17, 2083). No 2084/85 notice exists yet; expect it around Baisakh-Jestha 2084 (about May 2027). Eligibility has centred on permanent residents of Kathmandu Metropolitan City who finished SEE at a community school, or at a private school on a scholarship. Rules, documents and reservation categories change each year, so read the current notice.$$,
    $$Education Department, Kathmandu Metropolitan City, Kamaladi: kathmandu.gov.np$$,
    'https://ekantipur.com/national/2026/06/18/en/kathmandu-metropolitan-city-calls-for-re-application-for-11th-and-12th-grade-scholarships-54-22.html'
  ),

  -- VERIFIED: Embassy of India / CGI Birgunj advertisement PDF (2026-27 cycle)
  (
    'Atal Bihari Vajpayee General Scholarship Scheme (ABVGSS) - ICCR, Undergraduate in India',
    'Scholarship',
    $$ICCR scholarship for Nepali nationals to study undergraduate courses at Indian universities and institutes, applied for through the ICCR A2A portal and the Embassy of India in Kathmandu. It does not cover medical or paramedical courses, law, or integrated courses such as BALLB.$$,
    'Indian Council for Cultural Relations (ICCR) via Embassy of India, Kathmandu',
    'https://a2ascholarships.iccr.gov.in/',
    null,
    null,
    null,
    'India (university or institute allotted by ICCR)',
    false,
    'Any undergraduate program',
    'Class 12 graduates aged 18-35 (as of July 1 of the application year)',
    'NPR 400 application fee (bank deposit)',
    'Online application, essay and in-person document submission',
    null,
    'Intermediate',
    array['scholarship','india','iccr','undergraduate','embassy of india','nepal'],
    null,
    $$1) Apply on the A2A portal (a2ascholarships.iccr.gov.in). 2) Deposit the NPR 400 fee at Nepal SBI in favor of the Embassy's Education Wing and write your online registration number and name on the receipt. 3) Submit the original receipt, a printout of your application and the uploaded documents to the Embassy of India in Kathmandu, or to the Consulate General in Birgunj if you are from Bara, Chitwan, Dhanusha, Mahottari, Makwanpur, Parsa, Rautahat or Sarlahi. 4) Write the mandatory 500-word essay and include the English-proficiency undertaking signed by your last school's principal.$$,
    $$Date note: the 2026-27 window closed April 15, 2026 (portal opened Feb 27, 2026). The Embassy home page lists an "ICCR Scholarship 2027-28" update that was not read, so expect the next window around Feb-Apr 2027. Science and engineering applicants need Physics, Chemistry and Mathematics in Class 12 (biology-based courses need Biology, Physics, Chemistry). Age: 18 minimum, 35 maximum for undergraduate courses as of July 1. Applications are accepted only directly from the student, not through agents.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://www.cgibirgunj.gov.in/docs/1773213084ICCR-GSS-SJSS-2026-27-Advertisement.pdf'
  ),

  -- VERIFIED: Embassy of Japan in Nepal MEXT page (2027 intake cycle)
  (
    'Japanese Government (MEXT) Scholarship - Undergraduate (Embassy of Japan in Nepal)',
    'Scholarship',
    $$Fully funded Japanese government scholarship for Nepali students to study for a bachelor's degree in Japan. Reported benefits are tuition, a monthly stipend (about JPY 117,000 for undergraduate students) and airfare. All applications go through the Embassy of Japan in Kathmandu and no application fee is charged. Many undergraduate programs are taught in Japanese.$$,
    'Embassy of Japan in Nepal / MEXT',
    'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00723.html',
    null,
    null,
    null,
    'Japan (university placement by MEXT)',
    false,
    'Any undergraduate program',
    'Class 12 completers; the 2027 intake required birth after April 2, 2002',
    'No application fee; fully funded if selected',
    'Application, written exams and interview over several months',
    null,
    'Advanced',
    array['scholarship','japan','mext','undergraduate','embassy of japan','nepal','fully funded'],
    null,
    $$1) Watch the Embassy of Japan scholarship page around April-May. 2) Download the undergraduate forms, complete them and email them to education@km.mofa.go.jp before the deadline. 3) Sit the Embassy written exam and interview if shortlisted. 4) MEXT makes the final selection and placement.$$,
    $$Date note: for the 2027 intake the Embassy's undergraduate deadline was June 14, 2026 (24:00), and the page was published Apr 21-26, 2026. The 2028-intake call is expected around April-May 2027; no date is confirmed. Nepal receives few undergraduate awards a year (one undergraduate award was reported for the 2026 cycle).$$,
    $$education@km.mofa.go.jp$$,
    'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00723.html'
  ),

  -- VERIFIED: edusanjal listings of the four 2083 provincial notices
  (
    'Kathmandu University Provincial Government Tuition Scholarships (Bagmati, Gandaki, Karnali, Madhesh)',
    'Scholarship',
    $$Four provincial governments each recommend students for tuition-fee scholarships at Kathmandu University undergraduate programs, such as BE Mining, BE Chemical, BE Environmental, B.Sc. Environmental Science, Bachelor in Health Informatics and (Bagmati, Karnali) B.Sc. Agriculture. Usually one seat per listed program per province, and only the tuition fee is waived.$$,
    'Provincial governments of Bagmati, Gandaki, Karnali and Madhesh with Kathmandu University',
    'https://edusanjal.com/scholarship/ku-bagmati-provincial-scholarship/',
    null,
    null,
    null,
    'Kathmandu University, Dhulikhel',
    false,
    'Science and Engineering',
    'Class 12 Science graduates from the province',
    'Tuition fee waived; other KU fees paid by the student',
    'Email or office application with documents in one PDF',
    null,
    'Intermediate',
    array['scholarship','kathmandu university','provincial','engineering','science','nepal'],
    null,
    $$1) Watch your provincial social development or education ministry website around Asar-Shrawan for the KU notice. 2) Compile the application letter, Class 12 marksheet, citizenship, ID of underprivileged status (if applicable) and the other listed documents into a single PDF. 3) Send it to the ministry by the deadline (2083: Bagmati mosd.bagamati@gmail.com; Gandaki mosdgedu@gmail.com). 4) Madhesh also holds an interview with a three-member ministry committee.$$,
    $$Date note: the 2083/84 windows are all closed (Bagmati Jul 2-16, 2026; Madhesh Jul 2-22; Gandaki Jul 10-30; Karnali Jul 13-27). The next notices are expected around June-July 2027. Eligibility differs by province: Bagmati needs permanent residence in Bagmati; Gandaki needs Grade 12 Science completed in 2083 BS with priority to top scores; Karnali needs Class 12 Science from a Karnali school; Madhesh scores marks, local-level hardship recommendation (up to 10) and an interview (up to 20). Apply to only one program per notice.$$,
    $$See each province's notice via edusanjal.com (KU Bagmati, Gandaki, Karnali and Madhesh Provincial Scholarship 2083).$$,
    'https://edusanjal.com/scholarship/ku-madhesh-provincial-scholarship/'
  ),

  -- VERIFIED: Diplomat Nepal report of the ministry notice (Jul 30, 2026)
  (
    'Pakistan Technical Assistance Programme (PTAP) Scholarship - B.Sc. Engineering and D Pharmacy',
    'Scholarship',
    $$Government of Pakistan scholarships for Nepali students, offered through Nepal's Ministry of Education and Sports, for B.Sc. Engineering (Civil, Computer and Electrical: 2 seats each) and D Pharmacy (8 seats) for 2026-27. Selection uses the IOE Pulchowk entrance examination merit list.$$,
    'Government of Pakistan via Ministry of Education and Sports (Nepal)',
    'https://diplomatnepal.com/news/ministry-of-education-introduces-scholarship-opportunity-for-nepali-students-under-ptap/',
    null,
    null,
    null,
    'Pakistan (host institutions)',
    false,
    'Engineering and Pharmacy',
    'Class 12 (or equivalent) graduates with an IOE entrance result',
    'Scholarship (check the ministry notice for covered costs)',
    'Google Form plus documents',
    null,
    'Intermediate',
    array['scholarship','pakistan','ptap','engineering','pharmacy','nepal'],
    null,
    $$1) Watch the education ministry's notices after IOE results are out. 2) Fill the ministry's Google Form within the deadline. 3) Attach your transcript, Nepali citizenship certificate and IOE entrance score card.$$,
    $$Date note: the 2026-27 call was published around Jul 30, 2026; the news item gives no deadline and no later notice was found. The next call is expected after the 2027 IOE results (about Jul-Aug 2027). You must have passed Grade 12 and appear in the IOE entrance results.$$,
    $$Ministry of Education and Sports, Government of Nepal$$,
    'https://diplomatnepal.com/diplomacy/education/ministry-of-education-introduces-scholarship-opportunity-for-nepali-students-under-ptap/'
  ),

  -- THIN: educatenepal summary of the ministry notice (details not read in full)
  (
    'Nepal Government Engineering Scholarship (IOE Merit List) - Education Ministry',
    'Scholarship',
    $$The Scholarship Department of Nepal's education ministry (Kesharmahal) invites applications for government-funded scholarships in B.Sc.-level engineering for candidates placed on the Tribhuvan University Institute of Engineering (IOE) entrance merit list. Students who pass the IOE entrance and meet the ministry's scholarship regulations are eligible.$$,
    'Ministry of Education (Government of Nepal), Scholarship Department',
    'https://www.educatenepal.com/news/detail/engineering-scholarship-from-ministry-of-education-science-and-technology-government-of-nepal',
    null,
    null,
    null,
    'Nepal',
    false,
    'Engineering',
    'Class 12 graduates on the IOE entrance merit list',
    'Scholarship (check the ministry notice for covered costs)',
    null,
    null,
    'Intermediate',
    array['scholarship','engineering','ioe','government','nepal'],
    null,
    $$1) Sit the IOE BE/BArch entrance exam. 2) When the ministry publishes the scholarship notice after the results, apply by the deadline with your IOE score card and documents.$$,
    $$Thin entry: based on the educatenepal.com summary of the ministry notice; the notice itself was not read, and no 2083/84 deadline was found. Read the ministry notice for quotas, income and category rules.$$,
    $$Scholarship Department, Kesharmahal, Kathmandu$$,
    'https://www.educatenepal.com/news/detail/engineering-scholarship-from-ministry-of-education-science-and-technology-government-of-nepal'
  ),

  -- VERIFIED: MEC notices (MECEE-BL 2027, notices dated Aug 7 and Sept 7, 2026)
  (
    'MECEE-BL - Medical Education Common Entrance Exam (MBBS, BDS, Nursing and other health programs)',
    'Opportunity',
    $$The Medical Education Commission's single national entrance exam for bachelor-level health programs: MBBS, BDS, BSc Nursing/Midwifery, BASLP, B Perfusion Technology, BAMS, BNS, BSc MLT, BSc MIT, B Pharmacy, B Optometry, BPT and BPH. Seats are allocated by rank at central counseling.$$,
    'Medical Education Commission (MEC), Government of Nepal',
    'https://entrance.mec.gov.np/',
    null,
    null,
    null,
    'Kathmandu Valley exam centers',
    false,
    'Health Sciences',
    'Class 12 (+2 / A-level) graduates, usually with Physics, Chemistry and Biology',
    'About NPR 4,000 for Nepali applicants (2027 cycle, per listings)',
    'Online application plus a 3-hour exam',
    null,
    'Advanced',
    array['entrance exam','mbbs','bds','nursing','medical','nepal','mec'],
    $$MEC published a revised syllabus (revised April 28, 2026) for the bachelor-level common entrance. Use the MEC site for syllabus and past papers.$$,
    $$1) Watch mec.gov.np for the notice (2027 cycle: notice Shrawan 21, 2083). 2) Apply at entrance.mec.gov.np with the regular fee, then pay a double fee in the grace window if you missed it. 3) Download your admit card from your profile five days before the exam. 4) After the result, fill your priorities for central matching and admission.$$,
    $$Date note: MECEE-BL 2027 applications closed (regular fee Shrawan 25-Bhadra 15, 2083, i.e. Aug 10-31, 2026, with a double-fee grace period to about Sept 7); the exam is in about the third week of Ashoj 2083 (Oct 2026), with exact dates published in the Sept 7, 2026 notice. The previous round (MECEE-BL 2026) ran Nov 1-2, 2025. The next application window is expected around Aug-Sept 2027. Subject and percentage requirements vary by program; read the current notice.$$,
    $$entrance@mec.gov.np$$,
    'https://mec.gov.np/np'
  ),

  -- VERIFIED: educatenepal and IOE notices (2083/84 cycle)
  (
    'TU Institute of Engineering (IOE) BE/BArch Entrance Examination',
    'Opportunity',
    $$Computer-based entrance exam for Bachelor of Engineering and Architecture at Tribhuvan University's Institute of Engineering constituent campuses and affiliated colleges. Rank on the exam decides seat and campus allocation, and also feeds some government scholarship schemes.$$,
    'Tribhuvan University, Institute of Engineering (IOE) Entrance Examination Board',
    'https://entrance.ioe.edu.np/',
    null,
    null,
    null,
    'Exam centers across Nepal',
    false,
    'Engineering and Architecture',
    'Class 12 (or equivalent) graduates, or students who have taken the Class 12 final exam',
    'Entrance fee set in each notice',
    'Online application plus a computer-based exam',
    null,
    'Advanced',
    array['entrance exam','engineering','ioe','tribhuvan university','nepal'],
    null,
    $$1) Watch for the IOE notice around Asar (2083/84 application ran Ashadh 23-Shrawan 1, 2083). 2) Fill the form at entrance.ioe.edu.np and pay the fee by the deadline. 3) Sit the entrance exam. 4) Fill the priority form after the result and join the counseling.$$,
    $$Date note: the 2083/84 round is finished (applications Jul 7-17, 2026; exam from about Shrawan 11, 2083). The next notice is expected about June-July 2027. Past rule: at least 45% in Physics, Chemistry and Mathematics across Class 11 and 12 with at least a C grade in each (NEB); students who have taken the Class 12 final exam can also apply. Read the current notice for fees and the latest rule.$$,
    $$Entrance Examination Board, IOE, Pulchowk/Lalitpur$$,
    'https://blog.educatenepal.com/2026/06/tu-institute-of-engineering-ioe-bebarch.html'
  ),

  -- ===== Sports (under-18). ANFA (football federation) was suspended by FIFA on
  --       24 June 2026; check football notices before planning around ANFA events. =====

  -- VERIFIED: Himalayan Times and Ratopati reports (2026 edition)
  (
    'Asian Paints Champions Cup - Inter-School U-18 National Football Tournament (Boys and Girls)',
    'Competition',
    $$Nationwide inter-school football tournament for boys' and girls' under-18 teams, with provincial qualifiers and a national championship final in Kathmandu. The 2026 edition was organized by The Himalayan Times and Himalayan Dialogue with National Sports Council approval, with more than 300 schools and over 9,000 players.$$,
    'The Himalayan Times / Himalayan Dialogue (with National Sports Council approval)',
    'https://www.championscuptht.com/',
    null,
    null,
    null,
    'Provincial venues in all seven provinces; final in Kathmandu',
    false,
    'Sports',
    'School teams, boys and girls under 18',
    'Free to register in 2026 (check the current notice)',
    'About one month of rounds (2026: mid-September to Oct 2)',
    'Teamwork, football, competition experience',
    'Intermediate',
    array['sports','football','under-18','inter-school','nepal'],
    null,
    $$1) Your school registers a team on championscuptht.com before the deadline (2026: Aug 15). 2) Play the provincial selection rounds (2026: from Bhadra 25, at 14 grounds). 3) In 2026, six boys' teams and six girls' teams per province advanced to the national championship, with the final on Oct 2, 2026 in Kathmandu.$$,
    $$Date note: details are from the 2026 edition. The 2027 edition has not been announced; expect registration around July-August. Registration is by school team, so ask your school's sports teacher.$$,
    null,
    'https://thehimalayantimes.com/sports/all-nepal-u-18-inter-school-football-tournament-opens-registration'
  ),

  -- VERIFIED existence: The Rising Nepal report of the 14th edition (April 2024); no later dates found
  (
    'President Running Shield - National Under-18 Multi-Sport Championship (National Sports Council)',
    'Competition',
    $$The National Sports Council's biggest junior sports event: athletes under 18 are selected at school, local, district and provincial levels, then represent their province at a central tournament in Kathmandu. The 14th edition (April 16-18, 2024) had 686 athletes from seven provinces competing in athletics, volleyball, kabaddi, wushu, taekwondo and karate, with cash prizes and allowances.$$,
    'National Sports Council (Nepal)',
    'https://risingnepaldaily.com/news/41456',
    null,
    null,
    null,
    'Kathmandu (central tournament); selections in every province',
    false,
    'Sports',
    'Athletes under 18',
    'Free; participants get daily and transport allowances (2024)',
    'Selection rounds over several months plus a 3-day finals',
    'Athletics, team sports and martial arts competition',
    'Intermediate',
    array['sports','under-18','national sports council','athletics','taekwondo','karate','nepal'],
    null,
    $$1) Join your school's team in the initial phase. 2) Be selected at local, district and provincial level (through the district and provincial sports bodies). 3) If chosen, represent your province at the central tournament.$$,
    $$Date note: the details above are from the 2024 (14th) edition. Dates for later editions were not found, so ask your district sports development committee or National Sports Council for the current schedule and sport list. Provinces that won the shield thrice in a row keep it; Lumbini kept the old shield.$$,
    null,
    'https://risingnepaldaily.com/news/41456'
  ),

  -- ===== International programs and competitions =====

  -- VERIFIED: np.uwc.org calendar 2026-27 and eligibility pages
  (
    'UWC Nepal National Committee Selection - Entry 2027 (full or partial scholarship)',
    'Scholarship',
    $$Selection of Nepali students for the two-year International Baccalaureate Diploma at UWC schools and colleges abroad, with full or partial scholarships depending on family finances. UWC states that 80% of IB Diploma students chosen by national committees get full or partial support. UWC Nepal usually selects about 15-20 students a year; around 300 apply.$$,
    'UWC Nepal National Committee',
    'https://np.uwc.org/how-to-apply/',
    '2026-10-31',
    null,
    null,
    'Online application; selection in Kathmandu; study at a UWC abroad',
    false,
    'Study Abroad',
    'SEE (Grade 10) completers; born Mar 1, 2009 - Sep 1, 2011',
    'Full or partial scholarship based on need (check the application for any fee)',
    'Multi-stage selection from Oct 2026 to Jan 2027',
    'Leadership, intercultural skills, IB Diploma, community service',
    'Advanced',
    array['scholarship','uwc','ib','study abroad','class 10','nepal'],
    null,
    $$1) Create your account and submit the online application on np.uwc.org (Sept 22 - Oct 31, 2026, 11:59 PM Nepal time). 2) First stage: the committee reviews forms (Nov 6-18); first-interview names are published Nov 20. 3) Second stage: written exam, group activities and interview (Nov 28-29). 4) Final stage: interview and group activities (Dec 12); results published Jan 8, 2027; nominated names go to UWC Jan 31 - Feb 28, 2027.$$,
    $$Nepali citizen (you do not need your nagarikta to apply). For 2026 entry the page asked for at least GPA 3.0 (75%) from private schools or 2.8 (70%) from government schools on SEE/CBSE/ICSE or an equivalent; confirm the exact grade rule on the 2027 page. You can apply through only one National Committee. The FAQ says students from the SEE background must take a gap year under Nepal government rules. Dates are marked tentative on the UWC Nepal calendar.$$,
    $$UWC National Committee of Nepal, Thapathali Heights, Kathmandu: np.uwc.org$$,
    'https://np.uwc.org/uwc-nepal-calendar/'
  ),

  -- VERIFIED: Yale YYGS pages and listings (2027 cycle)
  (
    'Yale Young Global Scholars (YYGS) 2027 - need-based financial aid',
    'Summer Program',
    $$Two-week residential summer academic program at Yale University for high school students from around the world. Students choose interdisciplinary sessions such as Solving Global Challenges or Innovations in Science and Technology. Need-based financial aid can cover up to 100% of tuition for students from any country; students still arrange their own transportation.$$,
    'Yale University',
    'https://globalscholars.yale.edu/',
    '2027-01-06',
    null,
    null,
    'Yale University, New Haven, Connecticut, USA',
    false,
    'Academic enrichment',
    'Current high school sophomores or juniors (or international equivalent), about ages 16-18',
    'Tuition covered by aid up to 100%; application fee waiver available; travel not covered',
    'Two-week summer session plus application essays',
    'Global perspective, seminars, leadership',
    'Advanced',
    array['summer program','yale','financial aid','usa','high school'],
    null,
    $$1) Create an account on the YYGS site and complete the application, including the financial-aid section (aid cannot be requested later). 2) Early Action closes Oct 15, 2026 (11:59 PM ET); Regular Decision closes Jan 6, 2027 (11:59 PM ET). 3) Ask your school for the fee waiver form if the application fee (reported USD 85 early, USD 100 regular) is a burden.$$,
    $$YYGS accepts applications from all countries and offers aid to students from all countries. Early Action decisions come by Dec 11, 2026; Regular Decision decisions by Mar 10, 2027 (accept by Mar 15). The deadline shown is the final Regular Decision date; Early Action is nearer (Oct 15, 2026).$$,
    $$Questions: see globalscholars.yale.edu$$,
    'https://globalscholars.yale.edu/node/1455'
  ),

  -- VERIFIED: cee.org (RSI 2027 application note)
  (
    'Research Science Institute (RSI) 2027 - MIT and Stanford',
    'Summer Program',
    $$Free six-week summer research program for 100 high school students at MIT, with 50 more places at Stanford starting in 2027. Participants take a week of intensive STEM classes, then do five weeks of mentored research and present oral and written reports. International students are accepted.$$,
    'Center for Excellence in Education (CEE) with MIT and Stanford',
    'https://www.cee.org/programs/research-science-institute',
    '2026-12-11',
    null,
    null,
    'MIT (Cambridge, MA) and Stanford (CA), USA',
    false,
    'Science and Engineering',
    'High school juniors (seniors are not eligible)',
    'Cost-free to selected students (travel is the family''s responsibility; confirm with CEE)',
    'Six-week summer program plus application essays and recommendations',
    'Research design, scientific writing, presentation',
    'Advanced',
    array['summer program','research','stem','mit','stanford','free','usa'],
    null,
    $$1) Apply through CEE (cee.org) before 11:59 PM on Dec 11, 2026; late applications are not accepted. 2) Submit essays, two math or science teacher recommendations, your transcript and test scores. 3) International students apply through the same CEE system or participating country channels; check cee.org for the current route.$$,
    $$Open to students from the US and abroad; juniors only. Very selective (reported acceptance near 2.5-3%). The official page confirms the Dec 11, 2026 deadline; recommendation, test and transcript details come from secondary guides, so read CEE's FAQ before applying.$$,
    $$Center for Excellence in Education, McLean, VA: cee.org/contact-us$$,
    'https://www.cee.org/programs/research-science-institute'
  ),

  -- VERIFIED: technovationchallenge.org and chapter pages
  (
    'Technovation Girls 2027 Season - Build an App or AI Solution',
    'Competition',
    $$Free global program and competition for girls and non-binary or gender-diverse youth aged 8-18. Teams of 1-5 build a mobile app, web app or AI-powered tool that solves a community problem over the season (August to May), with mentors and free online curriculum. Divisions: Beginner 8-12, Junior 13-15, Senior 16-18.$$,
    'Technovation',
    'https://technovationchallenge.org/get-involved/students',
    null,
    null,
    null,
    'Online',
    true,
    'Technology',
    'Girls and non-binary youth aged 8-18 on Aug 1, 2027',
    'Free',
    'Season from about October to May',
    'App or AI building, teamwork, entrepreneurship, pitching',
    'Beginner',
    array['girls','coding','ai','app','entrepreneurship','free','online'],
    $$The Technovation curriculum is free for everyone to use (including boys and adults), even outside the competition.$$,
    $$1) Register on the Technovation global platform when 2027-season registration opens (a chapter page says October 2026). 2) Form a team of up to five and find a mentor (an adult 18+ who completes Technovation's training). 3) Build, test and submit your project by the season deadline. In 2025-26 student registration ran Aug 13, 2025 - Mar 18, 2026.$$,
    $$Date note: the official page said student registration was closed pending the 2026-27 season on the date checked; opening and closing dates for the 2027 season are not confirmed, so the deadline is blank. Eligibility: ages 8-18 on August 1, 2027.$$,
    null,
    'https://technovationchallenge.org/program-overview/'
  ),

  -- VERIFIED: yris.yira.org submission page and borderless listing (annual June deadline)
  (
    'Yale Review of International Studies (YRIS) High School Essay Contest',
    'Competition',
    $$Annual essay contest from Yale's student-run Yale Review of International Studies, open to high school students worldwide. Entrants write an essay under 1,500 words on a prompt about international affairs. Top essays are published and the contest has offered cash prizes (reported at USD 250/150/100 for the top three in the 2026 listing).$$,
    'Yale Review of International Studies (YRIS), Yale International Relations Association',
    'https://yris.yira.org/submit',
    null,
    null,
    null,
    'Online',
    true,
    'Social Studies',
    'High school students worldwide',
    'Free (per listing; confirm on the submission page)',
    'One essay (under 1,500 words)',
    'Research, argument, international affairs writing',
    'Intermediate',
    array['essay','international relations','writing','yale','free','online'],
    null,
    $$1) Check yris.yira.org/submit each spring for the new prompt and deadline. 2) Write an essay under 1,500 words (double-spaced). 3) Submit through the YRIS site before the deadline.$$,
    $$Date note: the official page showed the 2025 deadline as June 30, 2025 (11:59 PM EST), and a 2026 prompt about cultural relations exists, so the cycle is annual with a June deadline. No 2027 prompt or date has been published, so the deadline is blank.$$,
    $$Contact via yris.yira.org$$,
    'https://yris.yira.org/submit'
  ),

  -- ===== Schools and colleges =====

  -- VERIFIED: apply.ku.edu.np (KUCAT-CBT 2026 call)
  (
    'Kathmandu University KUCAT-CBT - Undergraduate Engineering and Science Admission',
    'Opportunity',
    $$Common computer-based admission test for undergraduate programs at Kathmandu University's School of Engineering and School of Science (PCM or PCB test groups), held at Dhulikhel, Lalitpur, Biratnagar and Butwal. Admission is by rank, with merit lists, quota lists and later expression-of-interest rounds. Bachelor in Health Informatics does not need KUCAT.$$,
    'Kathmandu University (School of Engineering and School of Science)',
    'https://apply.ku.edu.np/',
    null,
    null,
    null,
    'Dhulikhel, Lalitpur, Biratnagar, Butwal (test centers)',
    false,
    'Engineering and Science',
    'Class 12 (+2 Science), A-level or equivalent graduates',
    'Application form fee NPR 2,000 (2026)',
    'Online application plus a computer-based test',
    null,
    'Advanced',
    array['entrance exam','kathmandu university','engineering','science','kucat','nepal'],
    null,
    $$1) Watch apply.ku.edu.np for the Call for Application (2026 notice: June 17). 2) Register, fill the form and pay by eSewa or Khalti (2026: registration June 19 - July 9, form closed July 10). 3) Choose a test center; changes are not allowed after the deadline. 4) Sit KUCAT-CBT, check the program-wise merit list, then complete document verification and admission.$$,
    $$Date note: the 2026/27 call is finished (merit lists and orientation were in August 2026). The 2027/28 call is expected around mid-June 2027 and no date is confirmed. Full eligibility in the recent calls was a Class 12 pass with at least GPA 2.0 (50%) plus a KUCAT-CBT rank. Several KU scholarships exist; see the KU provincial scholarship entry.$$,
    $$apply.ku.edu.np$$,
    'https://apply.ku.edu.np/kucat26admissionCall.php'
  ),

  -- VERIFIED: educatenepal KUSOM notice (Fall 2026)
  (
    'Kathmandu University School of Management - KUUMAT (BBA, BBIS and related programs)',
    'Opportunity',
    $$The Kathmandu University Undergraduate Management Admission Test (KUUMAT) is required for admission to KU School of Management's BBA, BBIS and affiliated-college programs, with admission strictly by merit. KUSOM lists several scholarships.$$,
    'Kathmandu University School of Management (KUSOM)',
    'https://som.ku.edu.np/',
    null,
    null,
    null,
    'Dhulikhel and affiliated colleges',
    false,
    'Management',
    'Class 12 (+2) graduates in any discipline',
    'Application and test fee (check the notice)',
    'Online application plus one multiple-choice test',
    null,
    'Intermediate',
    array['entrance exam','kathmandu university','bba','bbis','management','nepal'],
    null,
    $$1) Watch som.ku.edu.np for the call (usually announced June, test in July). 2) Apply online only. 3) Sit KUUMAT and apply to KUSOM or an affiliated college using your score.$$,
    $$Date note: the Fall 2026 round is finished (forms due July 10, 2026; test July 20, 2026). The Fall 2027 round is expected about June-July 2027 and no date is confirmed. Minimum +2 marks differ between notices (a recent KU notice used 40% aggregate or CGPA 1.6; older pages say 50%), so read the current call. Contact: admission@kusom.edu.np$$,
    $$admission@kusom.edu.np$$,
    'https://www.educatenepal.com/notice-announcements/detail/kusom-admission-notice-for-bba-and-bbis-programs'
  ),

  -- VERIFIED: SXC admission notice for Class 11 (2083 BS)
  (
    'St. Xavier''s College (Maitighar) Class 11 Science Admission and KMC Scholarship Seats',
    'Opportunity',
    $$Class 11 Science admission at St. Xavier's College, Maitighar. For 2083 (2026) admission was based only on SEE GPA shortlisting and an interview, with no entrance test. Fifty scholarship seats are reserved for candidates referred by the Education Department of Kathmandu Metropolitan City.$$,
    'St. Xavier''s College, Maitighar',
    'https://sxc.edu.np/',
    null,
    null,
    null,
    'Maitighar, Kathmandu',
    false,
    'Science',
    'SEE (Grade 10) graduates',
    'Admission fees apply; KMC scholarship seats are fee-free',
    null,
    null,
    'Advanced',
    array['class 11','+2','science','scholarship','kathmandu','nepal'],
    null,
    $$1) Watch sxc.edu.np around SEE results (Ashad-Shrawan). 2) Apply online with your SEE grade sheet and documents. 3) Attend the interview if shortlisted and complete admission within the two days after the final list.$$,
    $$Date note: the 2083 admission round is finished. The process changes yearly (2024 used an entrance test on July 13, 2024; 2026 used GPA and interview only), so read the current notice. The 50 scholarship seats are open only to candidates selected and referred by Kathmandu Metropolitan City; see the KMC Class 11-12 scholarship entry.$$,
    null,
    'https://www.collegenp.com/admission/st-xaviers-college-class-11-admission-2026'
  ),

  -- THIN: educatenepal listing of the 2083 notice; seat counts only
  (
    'Pokhara University Bachelor-Level Scholarship (Science and Technology) 2083',
    'Scholarship',
    $$Pokhara University's Faculty of Science and Technology invites bachelor-level scholarship applications through its online scholarship portal, with seats listed by program in the 2083 notice, for example BE Civil (183 seats), BE Computer (107), BCSIT (94), BE IT (53) and BE Software (29).$$,
    'Pokhara University',
    'https://www.educatenepal.com/scholarships/detail/pokhara-university-bachelor-level-scholarship-notice',
    null,
    null,
    null,
    'Pokhara and affiliated campuses, Nepal',
    false,
    'Engineering and Technology',
    'Class 12 graduates entering Pokhara University programs',
    'Scholarship (check the notice for covered costs)',
    null,
    null,
    'Intermediate',
    array['scholarship','pokhara university','engineering','it','nepal'],
    null,
    $$Apply online through the official Pokhara University scholarship portal named in the notice, before the deadline.$$,
    $$Thin entry: taken from an educatenepal.com summary (2083/2026); the official notice, deadline and scholarship criteria were not read. Confirm everything on Pokhara University's own site before applying.$$,
    null,
    'https://www.educatenepal.com/scholarships/detail/pokhara-university-bachelor-level-scholarship-notice'
  ),

  -- THIN: Embassy of India notices on COMPEX (2025-26 cycle only)
  (
    'COMPEX Scholarship Scheme - Embassy of India, Kathmandu (Undergraduate Courses in India)',
    'Scholarship',
    $$Embassy of India scholarship scheme for undergraduate courses in India, awarded through an exam (COMPEX). For 2025-26 the Embassy posted the scheme on June 26, 2025, an exam schedule and mock-test link on July 18, 2025, and admit cards on July 23, 2025.$$,
    'Embassy of India, Kathmandu',
    'https://www.indembkathmandu.gov.in/education/news/scholarship',
    null,
    null,
    null,
    'Nepal (exam); India (study)',
    false,
    'Any undergraduate program',
    'Class 12 graduates (confirm in the notice)',
    'Check the Embassy notice',
    null,
    null,
    'Intermediate',
    array['scholarship','india','embassy of india','undergraduate','exam','nepal'],
    null,
    $$Watch the Embassy's scholarship news page around May-June for the COMPEX notice and exam schedule.$$,
    $$Thin entry: only the 2025-26 notice titles and dates were seen on the Embassy news list; the notice text, eligibility and fees were not read and no 2026-27 notice was found. Check the Embassy page directly before relying on this.$$,
    $$Education Wing, Embassy of India, Kathmandu: attacheedu.kathmandu@mea.gov.in$$,
    'https://www.indembkathmandu.gov.in/education/news/scholarship'
  ),

  -- VERIFIED: educatenepal copy of the school notice loaded Oct 11, 2026
  -- (bnks.edu.np itself blocks automated access)
  (
    'Budhanilkantha School Grade 11 (Science) Admission',
    'Opportunity',
    $$Budhanilkantha School, the government-designated national residential school in Budhanilkantha, Kathmandu, opens a limited number of places each year in Grade 11 (NEB, Science stream only). Admission is by entrance test.$$,
    'Budhanilkantha School',
    'https://www.educatenepal.com/notice-announcements/detail/budhanilkantha-school-announces-admission-for-neb-class-11',
    null,
    null,
    null,
    'Budhanilkantha, Kathmandu',
    false,
    'Science',
    'SEE (Grade 10) graduates meeting the Science-stream eligibility',
    $$Entrance-test charge: NPR 1,000 in the 2079 and 2081 notices; one report says the form charge was cut to NPR 100. Confirm in the current notice.$$,
    'Online application plus one entrance-test day',
    null,
    'Advanced',
    array['class 11','+2','science','entrance exam','budhanilkantha','kathmandu'],
    null,
    $$1) Watch bnks.edu.np and notice sites around Jestha-Ashad for the Grade 11 notice. 2) Fill in the online application form (the notice links the school admission portal) and pay the entrance-test charge online by eSewa, ConnectIPS or Khalti, as in the 2081 notice. 3) Print the admit card and sit the entrance test at the school.$$,
    $$NEB Grade 11, Science stream only, limited places. Date note: the latest notice found is for 2082 (form deadline 20 Ashad 2082, entrance test 22 Ashad 2082, posted Jun 29, 2025); the 2083 notice was not found. Earlier rounds were also in Ashad-Shrawan, so expect the next notice around June-July 2027; no date is confirmed. The school site bnks.edu.np blocks automated access, so this row links the educatenepal copy of the notice.$$,
    $$info@bnks.edu.np; 01-4370248 (reception); 01-4371637 (school gate), from an earlier notice$$,
    'https://www.educatenepal.com/notice-announcements/detail/budhanilkantha-school-announces-admission-for-neb-class-11'
  ),

  -- VERIFIED: mathsclub.ku.edu.np/events loaded Oct 11, 2026
  (
    'Kathmandu University Mathematics Club - Infinity School Competitions and Workshops',
    'Competition',
    $$The Kathmandu University Mathematics Students' Club (KUMSC) runs the annual Infinity math fest in September with school-level activities: a Mathematical Model Competition in two categories (Grades 8-10 and 11-12), mathematical games, high school workshops, and an Olympiad bootcamp led by past Nepal IMO participants. In 2024 it also hosted a Mathematics Olympiad with the Mathematical Association of Nepal (Sept 14, 2024).$$,
    'Kathmandu University Mathematics Students'' Club (KUMSC)',
    'https://mathsclub.ku.edu.np/events',
    null,
    null,
    null,
    'Kathmandu University, Dhulikhel, Kavre',
    false,
    'Mathematics',
    'Grades 8-12 (school competitions and workshops)',
    null,
    'A few days in September (2024: Sept 12-22)',
    'Mathematical modelling, problem solving, olympiad practice',
    'Intermediate',
    array['math','olympiad','competition','kathmandu university','workshop','school students'],
    null,
    $$No registration link was posted for a 2026 edition. Follow the club's pages linked from its website or email mathsclub@ku.edu.np and ask about Infinity 2026 registration for school students.$$,
    $$Date note: the club site listed no upcoming events on Oct 11, 2026, and its newest notices are from September 2025 (Infinity 2025 team named Sept 19, 2025). No 2026 Infinity dates were found, so the deadline is blank. The Mathematical Model Competition categories above are from the 2024 edition.$$,
    $$mathsclub@ku.edu.np; +977-9816386618; +977-9818715806$$,
    'https://mathsclub.ku.edu.np/events'
  )

) as v(
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
on conflict (title) do update set
  type = excluded.type, description = excluded.description,
  organizer = excluded.organizer, registration_link = excluded.registration_link,
  deadline = excluded.deadline, start_date = excluded.start_date,
  end_date = excluded.end_date, location = excluded.location,
  is_online = excluded.is_online, subject_area = excluded.subject_area,
  grade_requirements = excluded.grade_requirements, cost = excluded.cost,
  time_commitment = excluded.time_commitment, skills_gained = excluded.skills_gained,
  difficulty_level = excluded.difficulty_level, tags = excluded.tags,
  prep_resources = excluded.prep_resources, application_steps = excluded.application_steps,
  eligibility_details = excluded.eligibility_details, contact_info = excluded.contact_info,
  source_url = excluded.source_url;

-- =============================================================================
-- 6) COMPACT ROWS (YatraMap-sourced and corrected). Fields not listed here
--    (start/end dates, steps, contact, ...) are left as they already are.
--    registration_link falls back to the YatraMap detail page when blank;
--    source_url is always the YatraMap detail page.
-- =============================================================================

insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  location, is_online, subject_area, grade_requirements, cost,
  eligibility_details, tags, source_url
)
select
  title, type, description, organizer,
  coalesce(registration_link, 'https://yatramap.codeyatranp.com/opportunities/' || slug),
  deadline::date, location, is_online, subject_area, grade_requirements, cost,
  eligibility_details, tags::text[],
  'https://yatramap.codeyatranp.com/opportunities/' || slug
from (values

  ($$Sony World Photography Awards - Youth Competition 2027$$, $$Competition$$, $$Free global photography competition for photographers aged 19 and under (up to three theme-related images). A shortlist of up to 10 is judged for the Youth Competition Winner title, which comes with Sony digital imaging equipment. The overall winner is announced in April 2027.$$, $$World Photography Organisation$$, $$sony-world-photography-awards-youth-2027$$, $$https://www.worldphoto.org/$$, '2027-01-05', $$Online$$, true, $$Arts$$, $$Ages 19 and under$$, $$Free$$, $$Open worldwide to anyone aged 19 or under on the closing date. Entry is free. Closes 5 Jan 2027, 16:00 GMT. The separate Student competition (ages 18-30, registered photography institutions) closes Nov 27, 2026 and is not for under-19 entrants.$$, array['photography','art','competition','online']),
  ($$Diamond Challenge 2027 - High School Entrepreneurship$$, $$Competition$$, $$Free global entrepreneurship competition for high school teams of 2-4 students aged 14-18. Teams choose a Business Innovation or Social Innovation track and submit a written concept and pitch video. Top teams pitch at the Diamond Challenge Summit at the University of Delaware (April 29-30, 2027). Total prizes exceed USD 100,000; grand prizes per track are USD 12,000, 8,000 and 4,500.$$, $$Horn Entrepreneurship, University of Delaware$$, $$diamond-challenge-2027-high-school-entrepreneurship$$, $$https://diamondchallenge.org/$$, '2027-01-14', $$Online$$, true, $$Business$$, $$Ages 14-18$$, $$Free$$, $$Teams of 2-4 high school students aged 14-18 at the submission deadline, enrolled in a secondary school or program. Students may team up across schools, join one team and submit one concept per year. Submission window opened Sept 16, 2026; concept narrative and pitch video are due Jan 14, 2027 at 5:00 PM EST; finalists are announced in March 2027.$$, array['entrepreneurship','business','competition','online']),
  ($$International Mathematical Olympiad (IMO) 2027 - Nepal Selection$$, $$Olympiad$$, $$Nepal's IMO team of 6 is chosen by the Mathematical Association of Nepal through multi-stage selection and special training at district, provincial and national level (3,000+ students took part in the 2024 selection). The 2026 team competed at the 67th IMO in Shanghai.$$, $$Mathematical Association of Nepal (MAN)$$, $$international-mathematical-olympiad-imo-2027-nepal$$, null, null, $$Nepal (district, provincial and national rounds)$$, false, $$Mathematics$$, $$High school students$$, null, $$Secondary school students selected through the district, provincial and national rounds. Round dates for the 2027 selection were not found: ask your school or check with the Mathematical Association of Nepal.$$, array['math','olympiad','nepal','STEM']),
  ($$International Physics Olympiad (IPhO) - Nepal Team Selection$$, $$Olympiad$$, $$Nepal's International Physics Olympiad team is chosen through the Nepal Physics Olympiad (NePhO), run by the Nepal Physical Society. In 2025/26 the pre-selection round produced 25 national champions, who attended a closed camp at Tribhuvan University (13-22 May 2026) with theory and experimental exams; the top five went to IPhO 2026 in Colombia.$$, $$Nepal Physical Society (NePhO committee), supported by the education ministry$$, $$international-physics-olympiad-nepal$$, $$https://nps.org.np/nepho-2/$$, null, $$Kathmandu (Tribhuvan University) plus pre-selection centers$$, false, $$Science$$, $$Secondary level (+2) science students$$, null, $$Pre-selection registration for 2026/27 had not been found on Oct 11, 2026; watch nps.org.np/nepho-2. Selected students need valid travel insurance for the camp and a passport for IPhO registration. Funding for travel has been uncertain in some years, so confirm costs with the committee.$$, array['physics','olympiad','nepal','STEM']),
  ($$International History Olympiad 2027$$, $$Olympiad$$, $$Biennial international history olympiad for primary and secondary school students, with quiz rounds, exams and historical games. The next edition is in July 2027 (location to be announced). Students qualify through the Olympiad Qualifying Exam or IAC History Bee/Bowl events.$$, $$International Academic Competitions (IAC)$$, $$international-history-olympiad-2027$$, $$https://www.historyolympiad.com/$$, null, $$Host city to be announced (July 2027)$$, false, $$Social Studies$$, $$Students who completed Grade 2 by July 2027 (divisions from Elementary to Varsity)$$, null, $$Open to students worldwide. Qualify through the Olympiad Qualifying Exam (available since Sept 2025) or IAC History Bee/Bowl tournaments. Registration for 2027 is expected to open in late 2026 and close around late June 2027. Registration fees cover events and field trips; meals and lodging are separate. Questions: olympiad@iacompetitions.com$$, array['history','olympiad','humanities']),
  ($$Trust for Sustainable Living International Student Competition 2027$$, $$Competition$$, $$Global sustainability competition for students aged 7-18, with creative entries and debate. Expected to open in early September 2026.$$, $$Trust for Sustainable Living$$, $$trust-for-sustainable-living-student-competition-2027$$, null, null, $$Online$$, true, $$Environment$$, $$Ages 7-18$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['sustainability','environment','competition','online']),
  ($$Conrad Challenge 2026-2027$$, $$Competition$$, $$Online innovation competition where student teams progress through activation, innovation and summit stages.$$, $$Conrad Foundation / Space Center Houston$$, $$conrad-challenge-2026-2027$$, null, null, $$Online$$, true, $$Technology$$, $$Student teams (check age bracket)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['innovation','STEM','teams','online']),
  ($$ITU Robotics for Good Youth Challenge 2026-27$$, $$Competition$$, $$UN-backed challenge for young people to design AI and robotics solutions to real-world problems such as health, with regional rounds and global finals at the AI for Good Global Summit.$$, $$ITU / AI for Good$$, $$itu-robotics-for-good-youth-challenge-2026$$, null, null, $$Online / global$$, true, $$Technology$$, $$Young people (check age bracket)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['robotics','AI','social good','UN']),
  ($$World Robot Olympiad (WRO)$$, $$Competition$$, $$Robotics competition drawing young participants from 90+ countries to build and program robots for themed challenges.$$, $$World Robot Olympiad International$$, $$world-robot-olympiad-wro-international-robotics-competition$$, $$https://wro-association.org/$$, null, $$Online$$, true, $$Technology$$, $$Young students (check age category)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['robotics','competition','STEM']),
  ($$picoCTF$$, $$Competition$$, $$Free, beginner-friendly cybersecurity capture-the-flag competition from Carnegie Mellon University CyLab, open to middle and high school students.$$, $$Carnegie Mellon University CyLab$$, $$picoctf-free-cybersecurity-competition-students$$, $$https://picoctf.org/$$, null, $$Online$$, true, $$Technology$$, $$Middle and high school students$$, $$Free$$, null, array['cybersecurity','CTF','coding','free']),
  ($$AnimalHack 2026$$, $$Hackathon$$, $$Free student-organized online hackathon for all ages and skill levels to build technology that improves human-animal relationships.$$, $$Binnovative / AnimalHack$$, $$animalhack-2026$$, null, null, $$Online$$, true, $$Technology$$, $$All ages and skill levels$$, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['hackathon','coding','animals','free']),
  ($$Banana Hacks 2026$$, $$Hackathon$$, $$Free, fully virtual generative-AI and image-creation hackathon with workshops, office hours and sponsor-supported compute credits.$$, $$Banana Hacks$$, $$banana-hacks-2026$$, null, null, $$Online$$, true, $$Technology$$, null, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['hackathon','AI','coding','free']),
  ($$Codeforces Global Rounds$$, $$Competition$$, $$Free, open-rated online programming contests that anyone worldwide can join.$$, $$Codeforces$$, $$codeforces-global-rounds-free-online-programming$$, $$https://codeforces.com/$$, null, $$Online$$, true, $$Technology$$, $$Open to anyone worldwide$$, $$Free$$, null, array['competitive programming','coding','free','online']),
  ($$AtCoder Beginner Contests$$, $$Competition$$, $$Free, beginner-friendly programming contests from Japan held every Saturday, open to anyone worldwide.$$, $$AtCoder Inc.$$, $$atcoder-beginner-contests-free-weekly-programming$$, $$https://atcoder.jp/$$, null, $$Online$$, true, $$Technology$$, $$Open to anyone worldwide$$, $$Free$$, null, array['competitive programming','coding','free','weekly']),
  ($$Model United Nations (MUN) - Global Conferences$$, $$Competition$$, $$Student-run simulations of the United Nations with hundreds of conferences worldwide (NMUN, HMUN, WorldMUN and others). Build diplomacy, research and public-speaking skills.$$, $$Various (NMUN, HMUN, WorldMUN and others)$$, $$model-united-nations-mun-global-conferences-for-students$$, null, null, $$Worldwide$$, false, $$Social Studies$$, $$Students (varies by conference)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['MUN','debate','leadership','diplomacy']),
  ($$YouthSpeak Forum 2026 - Kathmandu$$, $$Workshop$$, $$AIESEC youth leadership event on the UN Sustainable Development Goals. Free to attend, held in several cities including Kathmandu.$$, $$AIESEC$$, $$youthspeak-forum-2026-aiesec-youth-leadership$$, null, '2026-12-31', $$Kathmandu, Nepal$$, false, $$Leadership$$, $$Youth (check age requirement)$$, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['leadership','SDGs','youth','kathmandu']),
  ($$UNICEF U-Report Nepal$$, $$Opportunity$$, $$U-Report Nepal is UNICEF's youth polling and information chatbot on Viber (launched with Rakuten Viber). Young people share views through polls, get information on topics such as mental health, and results are shared with decision-makers. U-Report is open to ages 13-24.$$, $$UNICEF$$, $$unicef-u-report-nepal-youth-voice$$, $$https://www.unicef.org/nepal/press-releases/rakuten-viber-and-unicef-nepal-join-hands-empower-voices-children-and-youth-nepal$$, null, $$Online$$, true, $$Social Studies$$, $$Ages 13-24$$, $$Free$$, $$Free. Search for "U-Report Nepal" on Viber to subscribe. Check unicef.org/nepal or u-report.org for the current joining method.$$, array['youth voice','civic participation','nepal','online']),
  ($$WWF Nepal - Conservation Volunteer and Youth Programs$$, $$Volunteering$$, $$Conservation programs across Nepal including youth engagement, research internships and community-based wildlife monitoring.$$, $$WWF Nepal$$, $$wwf-nepal-conservation-volunteer-youth-programs$$, $$https://www.wwfnepal.org/$$, null, $$Nepal (Kathmandu, Chitwan, Bardia, Annapurna)$$, false, $$Environment$$, $$Check program age requirement$$, null, null, array['conservation','volunteering','environment','nepal']),
  ($$Goethe-Institut Kathmandu - German Courses and Study in Germany Info$$, $$Workshop$$, $$German language courses at all levels, Goethe-Zertifikat exams and information sessions about studying in Germany.$$, $$Goethe-Institut$$, $$goethe-institut-kathmandu-programs$$, null, null, $$Kathmandu, Nepal$$, false, $$Languages$$, null, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['german','language','study abroad','kathmandu']),
  ($$British Council Nepal - UK Scholarships and Advising$$, $$Opportunity$$, $$Scholarship information and free advising for Nepali students who want to study in the UK (Chevening, GREAT, Commonwealth and university-specific awards).$$, $$British Council Nepal$$, $$british-council-nepal-uk-scholarships-advising$$, $$https://www.britishcouncil.org.np/$$, null, $$Kathmandu, Nepal$$, false, $$Study Abroad$$, $$Students planning to study in the UK$$, $$Free advising$$, null, array['uk','study abroad','advising','scholarships','kathmandu']),
  ($$US Embassy Nepal - EducationUSA Advising$$, $$Opportunity$$, $$Free educational advising from the US Embassy in Kathmandu: US college applications, scholarships, visa preparation and programs for high-achieving, low-income students.$$, $$US Embassy Kathmandu / EducationUSA$$, $$us-embassy-nepal-educational-advising-opportunities$$, null, null, $$Kathmandu, Nepal$$, false, $$Study Abroad$$, $$Students planning to study in the US$$, $$Free$$, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['usa','study abroad','advising','kathmandu']),
  ($$Matriculate - Free Virtual College Advising$$, $$Opportunity$$, $$Free virtual college advising from students at top universities for high-achieving students from low-income backgrounds; first-generation students prioritized.$$, $$Matriculate$$, $$matriculate-free-virtual-college-advising-low-income$$, $$https://www.matriculate.org/$$, null, $$Online$$, true, $$Study Abroad$$, $$High-achieving, low-income students$$, $$Free$$, null, array['college advising','mentoring','free','online']),
  ($$Harvard Summer School - Secondary School Program$$, $$Summer Program$$, $$Seven-week summer program where high school students take Harvard college courses for credit and experience university life.$$, $$Harvard University$$, $$harvard-summer-school-secondary-school-program-for-high-school-students$$, $$https://summer.harvard.edu/$$, null, $$Cambridge, Massachusetts, USA$$, false, $$Academic$$, $$High school students$$, null, null, array['summer program','harvard','usa','college credit']),
  ($$Stanford Summer Humanities Institute$$, $$Summer Program$$, $$Three-week residential summer program where high school students explore philosophy, literature and history with Stanford faculty.$$, $$Stanford University$$, $$stanford-summer-humanities-institute-philosophy-history-and-literature$$, null, null, $$Stanford, California, USA$$, false, $$Humanities$$, $$High school students$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['summer program','stanford','humanities','usa']),
  ($$UNSW International Scholarships - Term 1, 2027$$, $$Scholarship$$, $$Umbrella application for multiple UNSW awards for international students starting undergraduate or postgraduate coursework in Term 1, 2027.$$, $$University of New South Wales$$, $$unsw-international-scholarships-term-1-2027$$, $$https://www.scholarships.unsw.edu.au/scholarships/id/1988$$, '2026-10-30', $$UNSW Sydney, Australia$$, false, $$Any undergraduate program$$, $$International students commencing UNSW undergraduate (or postgraduate coursework) study in Term 1, 2027$$, null, $$One application (code PUCA1029) considers you for several awards, including the International Scientia Coursework Scholarship (full tuition or AUD 20,000 a year, reported). Closes 11:59 PM AEST on Oct 30, 2026. You may apply with a pending admission application, but any offer needs an unconditional UNSW offer first. Excludes UNSW Online and UNSW Canberra.$$, array['scholarship','australia','undergraduate']),
  ($$NYU Abu Dhabi Scholarships 2027$$, $$Scholarship$$, $$Need-based financial aid for international undergraduates at NYU Abu Dhabi, awarded to students who file the CSS Profile on time. NYUAD accepts aid applications from all students regardless of citizenship. Merit-based fellowships may also be offered.$$, $$New York University Abu Dhabi$$, $$nyu-abu-dhabi-scholarships-2027-financial-aid$$, $$https://nyuad.nyu.edu/en/admissions/undergraduate/scholarships-and-financial-aid.html$$, '2027-01-05', $$Abu Dhabi, UAE$$, false, $$Any undergraduate program$$, $$Grade 12 finishers (undergraduate entry)$$, null, $$Admission deadlines: Early Decision I Nov 1, Early Decision II Jan 1, Regular Decision Jan 5 (binding for Early Decision). Financial aid (CSS Profile, school code 2785) is due Nov 10 / Jan 10 / Feb 1 respectively. Aid amounts depend on demonstrated need; read the current NYUAD page before relying on any figure.$$, array['scholarship','uae','undergraduate','need-based']),
  ($$Stipendium Hungaricum Scholarship 2027$$, $$Scholarship$$, $$Hungarian government scholarship covering tuition, living costs and accommodation, from bachelor's to PhD.$$, $$Tempus Public Foundation, Hungary$$, $$stipendium-hungaricum-scholarship-2027$$, $$https://stipendiumhungaricum.hu/$$, '2027-01-15', $$Hungary$$, false, $$Any undergraduate program$$, $$Bachelor's through PhD$$, null, $$Date note: the 2027/28 Call for Applications was not published on Oct 11, 2026 (portal expected around Nov 2026). Jan 15, 2027 follows the 2026/27 deadline (Jan 15, 2026, 2 p.m. CET). You must also be nominated by your country's Sending Partner, so check that Nepal is on the partner list in the Call and what the Nepal-side deadline is.$$, array['scholarship','hungary','undergraduate','fully funded']),
  ($$Türkiye Scholarships (Türkiye Bursları) 2027$$, $$Scholarship$$, $$Turkish government scholarship covering tuition, living costs and flights for international students, bachelor's through PhD.$$, $$Presidency for Turks Abroad and Related Communities (YTB), Turkey$$, $$turkiye-scholarships-2027$$, $$https://turkiyeburslari.gov.tr/$$, '2027-02-20', $$Turkey$$, false, $$Any undergraduate program$$, $$Bachelor's through PhD$$, null, $$Date note: the 2027 call was not announced on Oct 11, 2026. The usual window is about Jan 10 to Feb 20, so the Feb 20, 2027 date is expected, not confirmed. Undergraduate applicants must be under 21 with at least 70% in their secondary school average (reported by several guides); apply only through the official portal, free of charge.$$, array['scholarship','turkey','undergraduate','fully funded']),
  ($$Chinese Government Scholarship (CSC) 2027$$, $$Scholarship$$, $$Full scholarships from China's Ministry of Education for international students: tuition, accommodation, living stipend and health insurance at Chinese universities.$$, $$China Scholarship Council (CSC)$$, $$chinese-government-scholarship-csc-2027$$, null, null, $$China$$, false, $$Any undergraduate program$$, $$International students (confirm level on the official site)$$, null, $$Date note: no 2027 call was found on Oct 11, 2026, and CSC dates vary by university and agency, so the previous Mar 1, 2027 date has been removed. Check campuschina.org / studyinchina.csc.edu.cn and the Chinese embassy in Kathmandu.$$, array['scholarship','china','fully funded']),
  ($$Wells Mountain Initiative (WMI) Scholarship 2027$$, $$Scholarship$$, $$Partial undergraduate scholarship (up to USD 3,000 a year) for students from developing countries to study their first undergraduate degree or diploma in their home country or region. Supports tuition and fees, books and materials and related costs, for all years of the degree. The 2027 application is available from December 1, 2026.$$, $$Wells Mountain Initiative$$, $$wells-mountain-initiative-wmi-scholarship-2027$$, null, '2027-03-01', $$Home country or region$$, false, $$Any undergraduate program$$, $$Students in developing countries$$, null, $$Open to students 35 or younger on Aug 1, 2027 who are applying to university or in their first undergraduate degree or diploma. Not available for study in the US, Canada, Australia, UK or Western Europe. Application: essay, form and two recommendation letters. Closes Mar 1, 2027 at 11:59 PM EST; recipients are notified by Aug 1, 2027. Confirm Nepal's inclusion and the current application site before applying.$$, array['scholarship','developing countries','undergraduate']),
  ($$Indonesian Government KNB Scholarship$$, $$Scholarship$$, $$Fully funded bachelor's, master's or PhD study in Indonesia for students from developing countries including Nepal.$$, $$Government of Indonesia / Ministry of Education$$, $$indonesian-government-knb-scholarship-fully-funded-study-in-indonesia$$, null, null, $$Indonesia$$, false, $$Any undergraduate program$$, $$Bachelor's through PhD$$, null, $$Date note: no 2027 call was found on Oct 11, 2026, so the previous Apr 15, 2027 date has been removed. Confirm Nepal's eligibility and dates on the official KNB site and with the Indonesian embassy.$$, array['scholarship','indonesia','fully funded']),
  ($$University of South Wales Scholarship for Nepali Students$$, $$Scholarship$$, $$£2,500 per year for self-funding Nepali students on eligible undergraduate and postgraduate programmes.$$, $$University of South Wales$$, $$south-wales-scholarship-nepal-2026-27$$, null, null, $$Wales, United Kingdom$$, false, $$Any undergraduate program$$, $$Nepali students (undergraduate and postgraduate)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','uk','nepal','undergraduate']),
  ($$Newcastle University Scholarships for Nepali Students$$, $$Scholarship$$, $$Undergraduate and master's funding options for eligible Nepali applicants (2026 entry listed).$$, $$Newcastle University$$, $$newcastle-university-scholarships-nepali-students-2026$$, null, null, $$Newcastle upon Tyne, United Kingdom$$, false, $$Any undergraduate program$$, $$Nepali students (undergraduate and postgraduate)$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','uk','nepal','undergraduate']),
  ($$Aalto University Scholarships$$, $$Scholarship$$, $$Tuition waivers of 50-100% for non-EU students on bachelor's and master's programmes in technology, business and arts.$$, $$Aalto University$$, $$aalto-university-scholarships-finland$$, null, null, $$Espoo, Finland$$, false, $$Technology, Business and Arts$$, $$Bachelor's and master's applicants$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','finland','undergraduate','tuition waiver']),
  ($$Ashesi University Scholarships$$, $$Scholarship$$, $$Need- and merit-based undergraduate scholarships covering tuition and living expenses at Ashesi University in Ghana.$$, $$Ashesi University$$, $$ashesi-university-scholarships-ghana-undergraduate$$, null, null, $$Berekuso, Ghana$$, false, $$Any undergraduate program$$, $$Undergraduate applicants$$, null, $$Listing-only entry (YatraMap). Not checked against the official site as of Oct 11, 2026. Confirm the program, deadline and whether Nepali students are eligible before relying on it.$$, array['scholarship','ghana','undergraduate'])

) as v(
  title, type, description, organizer, slug, registration_link, deadline,
  location, is_online, subject_area, grade_requirements, cost,
  eligibility_details, tags
)
on conflict (title) do update set
  type = excluded.type, description = excluded.description,
  organizer = excluded.organizer, registration_link = excluded.registration_link,
  deadline = excluded.deadline, location = excluded.location,
  is_online = excluded.is_online, subject_area = excluded.subject_area,
  grade_requirements = excluded.grade_requirements, cost = excluded.cost,
  eligibility_details = excluded.eligibility_details, tags = excluded.tags,
  source_url = excluded.source_url;

notify pgrst, 'reload schema';

-- =============================================================================
-- PART 3: OFFICIAL REGISTRATION LINKS & REVISED CLEANUP
-- =============================================================================

-- =============================================================================
-- OpportunityHub — OFFICIAL REGISTRATION LINKS & REVISED CLEANUP
-- This section is part of the master setup file.
-- Safe to re-run.
--
-- What this file does
--   A) Removes rows whose existence could not be confirmed or that do not apply
--   B) Renames three rows whose names were wrong
--   C) Applies corrections found while locating the official pages
--   D) Adds one new row (HMUN Online)
--   E) Sets registration_link AND source_url to the official page for every row
--      (no YatraMap, news-site or aggregator link is left in either column)
--
-- Checked Oct 11, 2026. Where only the organizer's home page could be confirmed,
-- that home page is used; those rows are listed in the summary message.
-- =============================================================================

-- =============================================================================
-- A) REMOVALS
-- =============================================================================
-- AnimalHack: only the 2023 edition could be confirmed; no 2026 edition found.
-- Banana Hacks: no hackathon of that name found (only Google's 2025 Nano Banana event).
-- YouthSpeak Forum Kathmandu: no 2026 Kathmandu edition found; AIESEC events target ages 18-30.
-- Ashesi: the flagship scholarship (Mastercard Foundation) is for African students only.
delete from public.opportunities
where title in (
  'AnimalHack 2026',
  'Banana Hacks 2026',
  'YouthSpeak Forum 2026 - Kathmandu',
  'Ashesi University Scholarships'
);

-- =============================================================================
-- B) RENAMES (wrong names in the YatraMap listing)
-- =============================================================================
-- "MUN Global Conferences" mixed university conferences (NMUN, WorldMUN) with a high-school one.
update public.opportunities set
  title = 'Harvard Model United Nations (HMUN) 2027 - Boston'
where title = 'Model United Nations (MUN) - Global Conferences';

-- Nepal's EducationUSA center is run by USEF-Nepal (the Fulbright Commission), not the US Embassy.
update public.opportunities set
  title = 'EducationUSA Advising Center Nepal (USEF-Nepal) - Free US College Advising'
where title = 'US Embassy Nepal - EducationUSA Advising';

-- The German language center in Kathmandu is the Goethe-Zentrum Kathmandu (official partner).
update public.opportunities set
  title = 'Goethe-Zentrum Kathmandu - German Courses and Goethe-Zertifikat Exams'
where title = 'Goethe-Institut Kathmandu - German Courses and Study in Germany Info';

-- =============================================================================
-- C) CORRECTIONS FOUND WHILE LOCATING OFFICIAL PAGES
-- =============================================================================

-- Harvard MUN: official HMUN pages
update public.opportunities set
  type = 'Competition',
  organizer = 'Harvard Model United Nations (run by Harvard College students)',
  description = $$Four-day Model UN simulation for high school students at the Boston Sheraton and Marriott Copley Place, with more than 3,000 delegates from hundreds of schools around the world. Delegates play world leaders and draft resolutions in General Assemblies, specialized bodies and crisis committees.$$,
  deadline = '2026-12-01',
  start_date = '2027-01-28',
  end_date = '2027-01-31',
  location = 'Boston, Massachusetts, USA',
  is_online = false,
  subject_area = 'Social Studies',
  grade_requirements = 'High school students aged 13 or older (enrolled in, or recently graduated from, high school)',
  cost = $$Delegate fee US $115 (by Oct 1), $130 (by Nov 1) or $210 (by Dec 15, 2026), plus travel and hotel$$,
  time_commitment = 'Four-day conference plus country research beforehand',
  skills_gained = 'Diplomacy, research, public speaking, negotiation',
  difficulty_level = 'Intermediate',
  tags = array['MUN','debate','diplomacy','harvard','usa','high school'],
  application_steps = $$1) A school advisor registers the delegation on harvardmun.org. 2) Registration deadlines: priority Sept 1, general Oct 1, late Dec 1, 2026. 3) Acceptance is not guaranteed, so do not book travel before you are confirmed. 4) Pay the delegate fee by the stated dates and receive your country assignment.$$,
  eligibility_details = $$Open to high school students 13 or older, including those who graduate before the conference, but not to college students. Participation is through school delegations, and acceptance is competitive. HMUN Online (a cheaper virtual version) is listed separately.$$,
  contact_info = null
where title = 'Harvard Model United Nations (HMUN) 2027 - Boston';

-- EducationUSA Nepal: run by USEF-Nepal
update public.opportunities set
  organizer = 'U.S. Educational Foundation in Nepal (USEF-Nepal / Fulbright Commission)',
  description = $$Nepal's official EducationUSA Advising Center in central Kathmandu, run by USEF-Nepal and supported by the US Department of State. Offers free core advising on US college applications, a library and testing services, hosts the EducationUSA South Asia Tour each fall and spring, and runs the EducationUSA Opportunity Funds Program for high-achieving students from non-elite, disadvantaged backgrounds.$$,
  location = 'Gyaneshwor, Kathmandu',
  grade_requirements = 'Students planning to study in the US (any grade)',
  cost = 'Core advising is free',
  eligibility_details = $$Open to prospective students and parents. Opportunity Funds is selective and aimed at students from disadvantaged backgrounds. Book advising appointments through the USEF-Nepal site or the EducationUSA Nepal app.$$
where title = 'EducationUSA Advising Center Nepal (USEF-Nepal) - Free US College Advising';

-- Goethe-Zentrum Kathmandu
update public.opportunities set
  organizer = 'Goethe-Zentrum Kathmandu (official partner of the Goethe-Institut e.V.)',
  description = $$Leading German language center in Nepal and the only authorized exam center for Goethe-Institut exams (A1-B2) in the country. Courses run from A1 to C1 in line with the Common European Framework. Registration is on the center's website.$$,
  location = 'Ekantakuna Height, Lalitpur (previously Thapathali), Kathmandu Valley',
  contact_info = $$reception@goethe-kathmandu.edu.np | exam@goethe-kathmandu.edu.np$$,
  eligibility_details = $$The center describes its services as courses and exams for adults and asks for proof of age at registration, so confirm the minimum age with them before enrolling a student under 18. Exam fees are not included in course fees, and refunds are not possible once paid.$$
where title = 'Goethe-Zentrum Kathmandu - German Courses and Goethe-Zertifikat Exams';

-- Conrad Challenge: official 2026-27 student guide
update public.opportunities set
  description = $$Year-long entrepreneurship and innovation competition for high school student teams (2-5 students, ages 13-18, from any country). Teams design an innovation addressing a global challenge, build a business plan and pitch video, and top teams present at the Innovation Summit at Space Center Houston.$$,
  deadline = '2026-10-29',
  start_date = '2026-08-27',
  end_date = '2027-04-24',
  grade_requirements = 'Ages 13-18, in high school or officially homeschooled; teams of 2-5',
  cost = $$No fee to register and submit the first stage. A per-team fee applies at the Innovation Stage (USD 499 in 2025-26; confirm for 2026-27)$$,
  time_commitment = 'Aug 2026 - Apr 2027',
  application_steps = $$1) Register your whole team and a coach on the Conrad Challenge portal (conradchallenge.awardsplatform.com) between Aug 27 and Oct 29, 2026. 2) Finalize your team and innovation name and submit the Lean Canvas by Oct 29, 2026. 3) Innovation Stage submission due Jan 7, 2027 (online). 4) Finalists announced Feb 26, 2027; Innovation Summit Apr 21-24, 2027 in Houston.$$,
  eligibility_details = $$Registration window: Aug 27 - Oct 29, 2026 (Activation Stage due Oct 29-30 depending on the page; use Oct 29). Teams can mix students from different schools and countries. The competition does not award cash prizes. Contact: info@conradchallenge.org$$
where title = 'Conrad Challenge 2026-2027';

-- ITU Robotics for Good Youth Challenge: official page
update public.opportunities set
  description = $$UN-backed (ITU) youth challenge: teams design, build and program a robot for a mission based on a global challenge, with the 2026-27 theme of health emergencies (with WHO). Platform-agnostic, so teams can use locally sourced hardware. National and regional events feed the Grand Finale during the AI for Good Global Summit in Geneva, June 22-25, 2027.$$,
  deadline = '2027-04-01',
  start_date = '2026-10-01',
  end_date = '2027-06-25',
  location = 'National events in participating countries; online route; Grand Finale in Geneva',
  grade_requirements = 'Junior team: born 2012-2016. Senior team: born 2008-2011',
  eligibility_details = $$In-person participation depends on a National Organizer hosting a Local Chapter event in your country (period Oct 1, 2026 - Apr 1, 2027). Online participation: video and application form are due April 1, 2027. Nepal's chapter was run by the Robotics Association of Nepal for the 2025 final (Nepal's junior team placed second in Geneva in 2025); confirm with them whether a 2026-27 Nepal event is planned.$$
where title = 'ITU Robotics for Good Youth Challenge 2026-27';

-- Trust for Sustainable Living: official site; 2027 date not yet published
update public.opportunities set
  description = $$Free international student competition from the UK charity Trust for Sustainable Living, with a yearly sustainability theme (2026 theme: "Sustainability Culture"). Students submit essays, art, music, video or other creative pieces; top entries are invited to the International Student Debates. The 2026 edition received a record 2,710 entries from schools worldwide.$$,
  deadline = null,
  grade_requirements = 'Primary and secondary school students (teachers register as Teacher Champions)',
  eligibility_details = $$Date note: the 2026 entry deadline was Mar 1, 2026. TSL's site says registration for the next competition opens in September 2026; the 2027 theme and deadline were not found on the official site yet, so the deadline is blank. Teachers (or parents as Teacher Champions) register and submit student entries; written entries are limited to 600 words and audio/video to 3 minutes.$$
where title = 'Trust for Sustainable Living International Student Competition 2027';

-- IMO Nepal: Mathematical Association of Nepal official pipeline
update public.opportunities set
  registration_link = 'https://mathassociationnepal.org.np/',
  description = $$Nepal's International Mathematical Olympiad team of 6 is chosen by the Mathematical Association of Nepal (MAN), the official national representative for the IMO. The path is District Olympiad (DMO) -> Provincial (PMO) -> National (NMO, top 30) -> Team Selection Test -> IMO. The 2026 team competed at the 67th IMO in Shanghai.$$,
  grade_requirements = 'Students in Grades 8-12',
  eligibility_details = $$The DMO is held in all 77 districts: 50 multiple-choice questions in 100 minutes, with 25 or more (50%) needed to advance. MAN's site says DMO registration is open for Academic Year 2026; earlier DMO registration used an online form posted on MAN's notices page. Exact 2027 round dates were not found: check the notices page at mathassociationnepal.org.np/notices or ask your school.$$
where title = 'International Mathematical Olympiad (IMO) 2027 - Nepal Selection';

-- Aalto: official scholarship page
update public.opportunities set
  description = $$Tuition-fee waivers (50% or 100%) for non-EU/EEA students admitted to English-taught bachelor's and master's programs at Aalto University in Finland. There is no separate scholarship application: you tick the scholarship option on the admission application. Bachelor's tuition is EUR 12,000 a year for business and technology programs (reported), so the waiver can be large.$$,
  deadline = '2027-01-22',
  eligibility_details = $$Only students liable for tuition fees (non-EU/EEA citizens) can apply, and only on the admission form during the application period. The bachelor's application window for autumn 2027 is reported as Jan 7-22, 2027 (Finnish time); confirm on aalto.fi before the window. Aalto offers no university-wide scholarships for living costs.$$
where title = 'Aalto University Scholarships';

-- Newcastle: Vice-Chancellor's International Scholarship, Nepal is on the eligible list
update public.opportunities set
  description = $$Newcastle University's Vice-Chancellor's International Scholarships give GBP 7,000 per academic year toward tuition for the length of an undergraduate course. Nepal is on the eligible country list. Awards are made automatically to eligible students who hold an offer, with no separate application.$$,
  deadline = '2027-01-13',
  eligibility_details = $$For 2027/28 entry: apply to Newcastle through UCAS by Jan 13, 2027; if you receive an offer by Mar 31, 2027 you must accept Newcastle as Firm or Insurance choice by May 3, 2027. You must be assessed as an international fee payer, hold an offer for an eligible degree at the Newcastle city-centre campus, and be domiciled in an eligible country. Not available to INTO pathway students, current students or repeat-year students. Email: scholarship.applications@newcastle.ac.uk$$
where title = 'Newcastle University Scholarships for Nepali Students';

-- University of South Wales: official Nepal page
update public.opportunities set
  description = $$Self-funding Nepali students at the University of South Wales receive GBP 2,500 per year toward undergraduate or postgraduate tuition (courses starting Sept 2026 and Feb 2027), considered automatically when you apply. Students based in Nepal must pay 100% of tuition to be eligible for a CAS.$$,
  eligibility_details = $$Direct entry to an undergraduate degree is considered for NEB/HSEB/CBSE/HSC Class 12 graduates with 65% or above. A separate listing says the amount rises to GBP 3,000 if you receive your CAS by May 31; confirm on USW's page. The page lists a Kathmandu office at Buddhanagar-10, New Baneshwor. Check the page for 2027 start dates, as the posted dates cover Sept 2026 and Feb 2027 intakes.$$
where title = 'University of South Wales Scholarship for Nepali Students';

-- KNB: official portal and 2026/27 timeline
update public.opportunities set
  description = $$Fully funded Indonesian government scholarship (Kemitraan Negara Berkembang) for students from developing countries to study a bachelor's, master's or doctorate at one of 47 Indonesian host universities (about 200 awards in 2026). Applications go through the official KNB portal after you obtain a recommendation letter from the Indonesian Embassy.$$,
  eligibility_details = $$Date note: the 2026/27 call ran Feb 2 - Mar 31, 2026; no 2027/28 call has been announced, so the deadline is blank. Bachelor's applicants must be 21 or younger on Dec 31 of the call year, hold a valid official passport and have a recommendation letter from the Indonesian embassy covering their country (for Nepal, the Embassy of Indonesia in Kathmandu).$$
where title = 'Indonesian Government KNB Scholarship';

-- Stanford Summer Humanities Institute: official site
update public.opportunities set
  description = $$Three-week residential summer program at Stanford for rising high school juniors and seniors (grades 10-11). Students take college-level humanities seminars with Stanford faculty and write college-level papers. Tuition was USD 8,850 in 2026, and need-based financial aid (partial or full) is open to international applicants.$$,
  deadline = null,
  grade_requirements = 'Grades 10-11 (rising juniors and seniors)',
  cost = $$USD 8,850 tuition (2026); USD 65 application fee; need-based aid available$$,
  eligibility_details = $$Date note: the 2026 application is closed and the 2027 application was not open on Oct 11, 2026. Deadlines have fallen in early February (2026 financial-aid deadline: Feb 9). Aid requires the SSS Parents' Financial Statement and, for international families, the SSS International Student Financial Aid Profile (Stanford Pre-Collegiate Studies school code 200189).$$
where title = 'Stanford Summer Humanities Institute';

-- WMI: official application platform and contact
update public.opportunities set
  contact_info = $$info@wellsmountaininitiative.org (no fee is ever required to apply). Applications are submitted on WMI's official platform: apply.mykaleidoscope.com$$
where title = 'Wells Mountain Initiative (WMI) Scholarship 2027';

-- KMC: the date pattern changes yearly
update public.opportunities set
  eligibility_details = $$Date note: the 2083/84 cycle is finished (applications Jestha 1-10, 2083; exam Jestha 17, 2083). The window moves between years: the 2082/83 round ran applications Ashad 18-27, 2082 and the exam on Shrawan 3, 2082, while 2083/84 ran in Jestha. Expect the next notice somewhere between Baisakh and Ashad 2084 (about April-July 2027); no date is confirmed. Eligibility has centred on permanent residents of Kathmandu Metropolitan City who finished SEE at a community school, or at a private school on a scholarship. Rules, documents and reservation categories change each year, so read the current notice on kathmandu.gov.np or entrance.kathmandu.gov.np.$$
where title = 'Kathmandu Metropolitan City Class 11-12 Scholarship (Institutional Schools)';

-- PTAP: correct the publication date; official ministry notice
update public.opportunities set
  description = $$Government of Pakistan scholarships for Nepali students, offered through Nepal's Ministry of Education and Sports, for B.Sc. Engineering (Civil, Computer and Electrical: 2 seats each, with one seat per subject reserved for a female candidate) and D Pharmacy (8 seats) for 2026-27. Selection uses the IOE Pulchowk entrance examination merit list. Applications go through a Google Form linked from the ministry's notice.$$,
  eligibility_details = $$Date note: the ministry notice is dated Asar 22, 2083 (about Jul 6, 2026) and was reported on Jul 9, 2026; no deadline was recorded. The next call is expected after the 2027 IOE results (about Jul-Aug 2027). You must have passed Grade 12 (or equivalent) and be on the IOE entrance results. Documents: academic transcript, Nepali citizenship certificate and IOE score card. Contact: Scholarship Branch, Ministry of Education and Sports, Sanothimi, Bhaktapur (01-6634842).$$
where title = 'Pakistan Technical Assistance Programme (PTAP) Scholarship - B.Sc. Engineering and D Pharmacy';

-- President Running Shield: latest editions
update public.opportunities set
  description = $$The National Sports Council's biggest junior (under-18) sports competition. Athletes are selected through municipality and district rounds, then at province level, and each province sends a team to the central tournament in Kathmandu. The 15th edition ran May 28-30, 2025 and the 16th ran Jestha 20-22, 2083 (early June 2026), with six sports (athletics, volleyball, kabaddi, karate, taekwondo, wushu) and 66 gold medals. The Koshi province round in 2026 drew 1,700 players selected from all 14 districts.$$,
  eligibility_details = $$Date note: the 17th edition has not been announced, so no date is shown. Recent editions ran in May-June, with district and provincial selection in the weeks before. Participation is through school, municipality and district sports bodies, so ask your school sports teacher or district sports development committee. NSC's own site (nsc.gov.np) has often been out of date, so confirm schedules with your provincial sports development board.$$
where title = 'President Running Shield - National Under-18 Multi-Sport Championship (National Sports Council)';

-- KUUMAT: official portal and eligibility
update public.opportunities set
  application_steps = $$1) Watch som.ku.edu.np and ku.edu.np for the call (2025 deadline was Aug 8 with the test Aug 15; 2026's test was Jul 20). 2) Apply online on the KUSOM admission portal (som-admportal.ku.edu.np). 3) Sit KUUMAT and apply to KUSOM or an affiliated college using your score.$$,
  eligibility_details = $$Date note: the Fall 2026 round is finished (KUUMAT held Jul 20, 2026). Timing moves between years (June-August), and no Fall 2027 date is confirmed. Eligibility per KUUMAT guides: +2, intermediate or equivalent with at least 50% aggregate or CGPA 2.0 on a 4-point scale from a recognized board. Read the current call for the latest rule.$$
where title = 'Kathmandu University School of Management - KUUMAT (BBA, BBIS and related programs)';

-- Pokhara University: official portal and quota
update public.opportunities set
  description = $$Pokhara University's Faculty of Science and Technology, Faculty of Management Studies and Faculty of Humanities and Social Sciences invite bachelor-level scholarship applications at constituent, joint constituent and affiliated colleges. The 2083 notice listed 1,381 scholarship quotas (558 in science and technology), for example BE Civil (183), BE Computer (107), BCSIT (94), BE IT (53) and BE Software (29). Applications go through the university's scholarship portal.$$,
  deadline = null,
  eligibility_details = $$Date note: the 2083 round is finished (online application until Asar 14, 2083, about Jun 28, 2026; exams around Asar 20-21, 2083). The next round is expected about mid-2027; earlier rounds ran in Shrawan 2081 and Asar 2083, so check scholarship.pu.edu.np. Nepali citizens meeting the minimum qualifications under the Pokhara University Scholarship Regulations can apply; open and reserved quotas exist.$$
where title = 'Pokhara University Bachelor-Level Scholarship (Science and Technology) 2083';

-- UWC Nepal: application page details
update public.opportunities set
  cost = $$No application fee or recommendation letters are required to submit the application; finalists are asked to pay a fee later (per the 2025 FAQ; confirm for 2027). Scholarship covers full or partial cost based on family finances.$$,
  application_steps = $$1) Create an account on the UWC application portal and open the "UWC Nepal NC - Entry 2027" application (np.uwc.org/how-to-apply/application-form). 2) Complete the whole form before Oct 31, 2026, 11:59 PM Nepal time (an incomplete application is disqualified). 3) First stage: the committee reviews forms (Nov 6-18); first-interview names are published Nov 20. 4) Second stage: written exam, group activities and interview (Nov 28-29). 5) Final stage: interview and group activities (Dec 12); results Jan 8, 2027; nominated names go to UWC Jan 31 - Feb 28, 2027.$$
where title = 'UWC Nepal National Committee Selection - Entry 2027 (full or partial scholarship)';

-- MGSS / GJSS: official portal named in Embassy notices
update public.opportunities set
  application_steps = $$1) Watch the Embassy of India (indembkathmandu.gov.in) for the MGSS-GJSS notice, usually in Oct-Nov. 2) Apply online on the web portal named in the Embassy notice (www.goischolarship.com.np). 3) Upload your Class 10 mark sheet, proof of Class 11 enrolment attested by the principal (stating no other scholarship) and proof of Nepali citizenship. 4) Send later documents (Class 11 result, Class 12 status letter) to attacheedu.kathmandu@mea.gov.in by Dec 31 each year.$$
where title = 'Mahatma Gandhi Scholarship Scheme (MGSS) - Class 11';

update public.opportunities set
  application_steps = $$1) Watch the Embassy of India (indembkathmandu.gov.in) for the MGSS-GJSS notice, usually in Oct-Nov. 2) Apply online on the web portal named in the Embassy notice (www.goischolarship.com.np). 3) Upload your Class 12 mark sheet and proof of Nepali citizenship, plus the admission and enrolment documents the notice lists. 4) Send later documents to attacheedu.kathmandu@mea.gov.in by Dec 31 each year.$$
where title = 'Golden Jubilee Scholarship Scheme (GJSS) - First-Year Undergraduate';

-- Fix the generic "listing-only" note on rows now checked against official pages
update public.opportunities set
  eligibility_details = $$Checked against the organizer's official site on Oct 11, 2026 for existence and registration page. Confirm eligibility and the current year's dates there before applying.$$
where title in (
    'World Robot Olympiad (WRO)',
    'Matriculate - Free Virtual College Advising',
    'Harvard Summer School - Secondary School Program',
    'British Council Nepal - UK Scholarships and Advising'
  )
  and (eligibility_details is null or eligibility_details like 'Listing-only entry%');

-- =============================================================================
-- D) NEW ROW
-- =============================================================================
insert into public.opportunities (
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
select
  title, type, description, organizer, registration_link, deadline::date,
  start_date::date, end_date::date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags::text[], prep_resources, application_steps,
  eligibility_details, contact_info, source_url
from (values
  (
    'HMUN Online 2027 (Harvard Model United Nations - virtual)',
    'Competition',
    $$Virtual version of Harvard Model United Nations for high school students, run in sessions so delegates anywhere can take part without travelling to Boston. The 2026-27 registration timeline has an early-bird date, a Session I deadline and a Session II deadline.$$,
    'Harvard Model United Nations (run by Harvard College students)',
    'https://www.harvardmun.org/hmun-online/application-process',
    '2026-11-06',
    null,
    null,
    'Online',
    true,
    'Social Studies',
    'High school students aged 13 or older (enrolled in, or recently graduated from, high school)',
    $$Delegate fee US $50 (early bird) or US $75 (regular)$$,
    'Short online conference plus preparation',
    'Diplomacy, research, public speaking',
    'Intermediate',
    array['MUN','debate','diplomacy','harvard','online','high school'],
    null,
    $$1) Register on the HMUN Online application page. 2) Registration deadlines for 2026-27: early bird July 10, 2026 (passed), Session I Sept 13, 2026 (passed), Session II Nov 6, 2026. 3) Pay the delegate fee and complete your assignment prep.$$,
    $$Open to high school students aged 13 or older, including recent graduates, but not to college students. The deadline shown is the last published registration date (Session II); session dates were not captured, so check the page for them.$$,
    null,
    'https://www.harvardmun.org/hmun-online/application-process'
  )
) as v(
  title, type, description, organizer, registration_link, deadline,
  start_date, end_date, location, is_online, subject_area,
  grade_requirements, cost, time_commitment, skills_gained,
  difficulty_level, tags, prep_resources, application_steps,
  eligibility_details, contact_info, source_url
)
where not exists (
  select 1 from public.opportunities o where o.title = v.title
);

-- =============================================================================
-- E) OFFICIAL REGISTRATION LINK (and source) FOR EVERY ROW
-- =============================================================================
update public.opportunities o set
  registration_link = v.url,
  source_url = v.url
from (values

  -- ---- Part 1: verified rows -------------------------------------------------
  ('NASA Space Apps Challenge 2026', 'https://www.spaceappschallenge.org/2026/'),
  ('Cliburn International Competition for Young Pianists 2027', 'https://cliburn.org/competitions/2027-young-pianists/application-and-rules'),
  ('YIRA Global Essay Competition 2027 (Yale)', 'https://www.yira.org/'),
  ('Mahatma Gandhi Scholarship Scheme (MGSS) - Class 11', 'https://www.goischolarship.com.np/'),
  ('Golden Jubilee Scholarship Scheme (GJSS) - First-Year Undergraduate', 'https://www.goischolarship.com.np/'),
  ('Lester B. Pearson International Scholarship 2027 (University of Toronto)', 'https://www.future.utoronto.ca/pearson'),
  ('UBC International Scholars Program 2027', 'https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/'),
  ('National Astronomy Olympiad (NAO) - Nepal', 'https://www.nepalastronomicalsociety.org/projects/olympiad/'),

  -- ---- Part 1: previously listing-only rows ---------------------------------
  ('Sony World Photography Awards - Youth Competition 2027', 'https://www.worldphoto.org/'),
  ('Diamond Challenge 2027 - High School Entrepreneurship', 'https://diamondchallenge.org/'),
  ('Global Game Jam 2027', 'https://globalgamejam.org/'),
  ('International Mathematical Olympiad (IMO) 2027 - Nepal Selection', 'https://mathassociationnepal.org.np/'),
  ('International Physics Olympiad (IPhO) - Nepal Team Selection', 'https://nps.org.np/nepho-2/'),
  ('International History Olympiad 2027', 'https://www.historyolympiad.com/'),
  ('Trust for Sustainable Living International Student Competition 2027', 'https://trustforsustainableliving.org/'),
  ('Conrad Challenge 2026-2027', 'https://conradchallenge.awardsplatform.com/'),
  ('ITU Robotics for Good Youth Challenge 2026-27', 'https://aiforgood.itu.int/robotics-for-good-youth-challenge/'),
  ('World Robot Olympiad (WRO)', 'https://wro-association.org/'),
  ('picoCTF', 'https://picoctf.org/'),
  ('Codeforces Global Rounds', 'https://codeforces.com/'),
  ('AtCoder Beginner Contests', 'https://atcoder.jp/'),
  ('Harvard Model United Nations (HMUN) 2027 - Boston', 'https://www.harvardmun.org/application-process'),
  ('UNICEF U-Report Nepal', 'https://www.u-report.org/how-to-join-u-report'),
  ('WWF Nepal - Conservation Volunteer and Youth Programs', 'https://www.wwfnepal.org/'),
  ('Japan Resource Center (JRC) - Embassy of Japan, Kathmandu', 'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00138.html'),
  ('Goethe-Zentrum Kathmandu - German Courses and Goethe-Zertifikat Exams', 'https://www.goethe-kathmandu.edu.np/'),
  ('British Council Nepal - UK Scholarships and Advising', 'https://www.britishcouncil.org.np/'),
  ('EducationUSA Advising Center Nepal (USEF-Nepal) - Free US College Advising', 'https://usefnepal.org/education-usa/study-in-the-usa/'),
  ('Matriculate - Free Virtual College Advising', 'https://www.matriculate.org/'),
  ('Harvard Summer School - Secondary School Program', 'https://summer.harvard.edu/'),
  ('Stanford Summer Humanities Institute', 'https://summerhumanities.spcs.stanford.edu/'),
  ('UNSW International Scholarships - Term 1, 2027', 'https://www.scholarships.unsw.edu.au/scholarships/id/1988'),
  ('NYU Abu Dhabi Scholarships 2027', 'https://nyuad.nyu.edu/en/admissions/undergraduate/scholarships-and-financial-aid.html'),
  ('Stipendium Hungaricum Scholarship 2027', 'https://stipendiumhungaricum.hu/'),
  ('Türkiye Scholarships (Türkiye Bursları) 2027', 'https://turkiyeburslari.gov.tr/'),
  ('Chinese Government Scholarship (CSC) 2027', 'https://www.campuschina.org/'),
  ('Wells Mountain Initiative (WMI) Scholarship 2027', 'https://www.wellsmountaininitiative.org/'),
  ('Indonesian Government KNB Scholarship', 'https://knb.kemdiktisaintek.go.id/'),
  ('University of South Wales Scholarship for Nepali Students', 'https://www.southwales.ac.uk/international/your-country/nepal/'),
  ('Newcastle University Scholarships for Nepali Students', 'https://www.ncl.ac.uk/undergraduate/fees-funding/scholarships-bursaries/vc-international'),
  ('Aalto University Scholarships', 'https://www.aalto.fi/en/international-students/scholarships-study-right-started-on-or-after-1-august-2025'),

  -- ---- Part 2: new rows -----------------------------------------------------
  ('Kathmandu Metropolitan City Class 11-12 Scholarship (Institutional Schools)', 'https://entrance.kathmandu.gov.np/'),
  ('Atal Bihari Vajpayee General Scholarship Scheme (ABVGSS) - ICCR, Undergraduate in India', 'https://a2ascholarships.iccr.gov.in/'),
  ('Japanese Government (MEXT) Scholarship - Undergraduate (Embassy of Japan in Nepal)', 'https://www.np.emb-japan.go.jp/itpr_ja/11_000001_00723.html'),
  ('Kathmandu University Provincial Government Tuition Scholarships (Bagmati, Gandaki, Karnali, Madhesh)', 'https://ku.edu.np/news-app'),
  ('Pakistan Technical Assistance Programme (PTAP) Scholarship - B.Sc. Engineering and D Pharmacy', 'https://moest.gov.np/content/13636/information-regarding-scholarship/'),
  ('Nepal Government Engineering Scholarship (IOE Merit List) - Education Ministry', 'https://moest.gov.np/'),
  ('MECEE-BL - Medical Education Common Entrance Exam (MBBS, BDS, Nursing and other health programs)', 'https://entrance.mec.gov.np/'),
  ('TU Institute of Engineering (IOE) BE/BArch Entrance Examination', 'https://entrance.ioe.edu.np/'),
  ('Asian Paints Champions Cup - Inter-School U-18 National Football Tournament (Boys and Girls)', 'https://www.championscuptht.com/'),
  ('President Running Shield - National Under-18 Multi-Sport Championship (National Sports Council)', 'https://nsc.gov.np/'),
  ('UWC Nepal National Committee Selection - Entry 2027 (full or partial scholarship)', 'https://np.uwc.org/how-to-apply/application-form'),
  ('Yale Young Global Scholars (YYGS) 2027 - need-based financial aid', 'https://globalscholars.yale.edu/'),
  ('Research Science Institute (RSI) 2027 - MIT and Stanford', 'https://www.cee.org/programs/research-science-institute'),
  ('Technovation Girls 2027 Season - Build an App or AI Solution', 'https://technovationchallenge.org/get-involved/students'),
  ('Yale Review of International Studies (YRIS) High School Essay Contest', 'https://yris.yira.org/submit'),
  ('Kathmandu University KUCAT-CBT - Undergraduate Engineering and Science Admission', 'https://apply.ku.edu.np/'),
  ('Kathmandu University School of Management - KUUMAT (BBA, BBIS and related programs)', 'https://som-admportal.ku.edu.np'),
  ('St. Xavier''s College (Maitighar) Class 11 Science Admission and KMC Scholarship Seats', 'https://sxc.edu.np/'),
  ('Pokhara University Bachelor-Level Scholarship (Science and Technology) 2083', 'https://scholarship.pu.edu.np'),
  ('COMPEX Scholarship Scheme - Embassy of India, Kathmandu (Undergraduate Courses in India)', 'https://www.indembkathmandu.gov.in/about-education-and-scholarship'),

  -- ---- Part 3: new row ------------------------------------------------------
  ('HMUN Online 2027 (Harvard Model United Nations - virtual)', 'https://www.harvardmun.org/hmun-online/application-process')

) as v(title, url)
where o.title = v.title;

-- Publisher-created listings may share titles; seed upsert no longer needs a global unique title.
drop index if exists public.opportunities_title_key;

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

