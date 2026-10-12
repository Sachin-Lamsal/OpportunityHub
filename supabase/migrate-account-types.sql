-- Account types: student, school, organization
-- Run in Supabase SQL Editor after complete-schema.sql

alter table public.profiles
  add column if not exists account_type text not null default 'student',
  add column if not exists organization_name text,
  add column if not exists school_code text unique,
  add column if not exists school_id uuid references public.profiles (id) on delete set null;

alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('student', 'school', 'organization'));

create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists profiles_account_type_idx on public.profiles (account_type);

alter table public.opportunities
  add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists opportunities_created_by_idx on public.opportunities (created_by);

drop policy if exists "Schools can view linked student profiles" on public.profiles;
create policy "Schools can view linked student profiles"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles school
      where school.id = auth.uid()
        and school.account_type = 'school'
        and public.profiles.school_id = school.id
    )
    or exists (
      select 1 from public.profiles student
      where student.id = auth.uid()
        and student.account_type = 'student'
        and student.school_id = public.profiles.id
    )
  );

drop policy if exists "Schools can view linked student activities" on public.activities;
create policy "Schools can view linked student activities"
  on public.activities for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles student
      join public.profiles school on school.id = auth.uid()
      where student.id = activities.user_id
        and school.account_type = 'school'
        and student.school_id = school.id
    )
  );

drop policy if exists "Schools and orgs can create opportunities" on public.opportunities;
create policy "Schools and orgs can create opportunities"
  on public.opportunities for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and account_type in ('school', 'organization')
    )
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
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
          and account_type in ('school', 'organization')
      )
    )
  )
  with check (
    auth.uid() = created_by
    or (
      created_by is null
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
          and account_type in ('school', 'organization')
      )
    )
  );

drop policy if exists "Creators can delete opportunities" on public.opportunities;
create policy "Creators can delete opportunities"
  on public.opportunities for delete
  to authenticated
  using (
    auth.uid() = created_by
  );

-- RPC for secure lookup of school code by unauthenticated / student signups
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

-- Protect immutable fields from unauthorized escalation
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

-- Auto-create profile trigger updated for account types, school codes, and school IDs
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

notify pgrst, 'reload schema';
