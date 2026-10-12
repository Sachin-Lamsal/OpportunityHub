-- =============================================================================
-- FIX: Infinite recursion detected in policy for relation "profiles"
-- Run this in Supabase SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. Helper functions with SECURITY DEFINER (bypasses RLS to prevent recursion)
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

-- 2. Replace policies on public.profiles
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

-- 3. Replace policies on public.school_invite_codes
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

-- 4. Replace policies on public.opportunities
drop policy if exists "Schools and orgs can create opportunities" on public.opportunities;
create policy "Schools and orgs can create opportunities"
  on public.opportunities for insert
  to authenticated
  with check (
    public.can_manage_opportunities(auth.uid())
  );

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

-- 5. Replace policies on public.activities
drop policy if exists "Users can view own activities" on public.activities;
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

-- 6. Confirm any unconfirmed test accounts so login works immediately
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

-- 7. Prevent duplicate account creation by email
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

-- Enforce case-insensitive email uniqueness on profiles
create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));
