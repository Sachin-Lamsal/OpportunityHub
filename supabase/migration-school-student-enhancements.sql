-- ============================================================================
-- School/student enhancements: counselor activity verification
--
-- Apply this once to existing Supabase projects after the repository update.
-- It is safe to re-run. The function is intentionally SECURITY DEFINER so it
-- can update only verification fields without granting schools broad UPDATE
-- access to student activity records.
-- ============================================================================

alter table public.activities
  add column if not exists school_verified boolean not null default false,
  add column if not exists school_verified_at timestamptz,
  add column if not exists school_verified_by uuid references auth.users (id) on delete set null;

create index if not exists activities_school_verified_idx
  on public.activities (school_verified)
  where school_verified = true;

create or replace function public.set_school_activity_verification(
  activity_uuid uuid,
  should_verify boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  student_id uuid;
begin
  if caller_id is null or should_verify is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = caller_id and account_type = 'school'
  ) then
    raise exception 'Not authorized';
  end if;

  update public.activities a
  set
    school_verified = should_verify,
    school_verified_at = case when should_verify then now() else null end,
    school_verified_by = case when should_verify then caller_id else null end
  where a.id = activity_uuid
    and exists (
      select 1
      from public.profiles p
      where p.id = a.user_id
        and p.account_type = 'student'
        and p.school_id = caller_id
    )
  returning a.user_id into student_id;

  if student_id is null then
    raise exception 'Not authorized';
  end if;

  return student_id;
end;
$$;

revoke execute on function public.set_school_activity_verification(uuid, boolean)
  from public, anon;
grant execute on function public.set_school_activity_verification(uuid, boolean)
  to authenticated, service_role;
