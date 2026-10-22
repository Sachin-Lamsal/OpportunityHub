-- ============================================================================
-- OpportunityHub — verified participation and student experience reviews
--
-- This migration is self-contained and safe to re-run. It also creates the
-- legacy school-verification columns when an older project has not run the
-- school/student enhancement migration yet.
--
-- It keeps the existing school_verified fields for backwards compatibility,
-- while adding a generic participation record that can be confirmed by either
-- the student's linked school or the organization that created the listing.
-- ============================================================================

alter table public.activities
  add column if not exists school_verified boolean not null default false,
  add column if not exists school_verified_at timestamptz,
  add column if not exists school_verified_by uuid references auth.users (id) on delete set null,
  add column if not exists participation_status text not null default 'unverified',
  add column if not exists participation_requested_at timestamptz,
  add column if not exists participation_confirmed_at timestamptz,
  add column if not exists participation_confirmed_by uuid references auth.users (id) on delete set null,
  add column if not exists participation_confirmed_by_type text;

create index if not exists activities_school_verified_idx
  on public.activities (school_verified)
  where school_verified = true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_participation_status_check'
  ) then
    alter table public.activities
      add constraint activities_participation_status_check
      check (participation_status in ('unverified', 'pending', 'confirmed', 'declined'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_participation_confirmed_by_type_check'
  ) then
    alter table public.activities
      add constraint activities_participation_confirmed_by_type_check
      check (
        participation_confirmed_by_type is null
        or participation_confirmed_by_type in ('school', 'organization')
      );
  end if;
end;
$$;

-- Preserve confirmations created with the earlier school verification feature.
update public.activities
set
  participation_status = 'confirmed',
  participation_requested_at = coalesce(participation_requested_at, school_verified_at, created_at),
  participation_confirmed_at = coalesce(participation_confirmed_at, school_verified_at),
  participation_confirmed_by = coalesce(participation_confirmed_by, school_verified_by),
  participation_confirmed_by_type = coalesce(participation_confirmed_by_type, 'school')
where school_verified = true
  and participation_status <> 'confirmed';

create index if not exists activities_participation_status_idx
  on public.activities (participation_status)
  where participation_status in ('pending', 'confirmed');

create index if not exists activities_opportunity_participation_idx
  on public.activities (opportunity_id, participation_status)
  where opportunity_id is not null;

-- Students request confirmation only for an opportunity already linked to a
-- portfolio activity. A student may re-request after a removed/declined
-- confirmation, but cannot alter a completed confirmation themselves.
create or replace function public.request_activity_participation_verification(
  activity_uuid uuid
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
  if caller_id is null or activity_uuid is null then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = caller_id and account_type = 'student'
  ) then
    raise exception 'Only student accounts can request participation confirmation';
  end if;

  update public.activities
  set
    participation_status = 'pending',
    participation_requested_at = now(),
    participation_confirmed_at = null,
    participation_confirmed_by = null,
    participation_confirmed_by_type = null,
    school_verified = false,
    school_verified_at = null,
    school_verified_by = null
  where id = activity_uuid
    and user_id = caller_id
    and opportunity_id is not null
    and participation_status <> 'confirmed'
  returning user_id into student_id;

  if student_id is null then
    raise exception 'This participation record cannot be requested for confirmation';
  end if;

  return student_id;
end;
$$;

-- Re-state the earlier school RPC so school confirmations now complete the
-- generic participation record too. The existing linked-school relationship
-- remains the authorization boundary.
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
    select 1 from public.profiles
    where id = caller_id and account_type = 'school'
  ) then
    raise exception 'Not authorized';
  end if;

  update public.activities a
  set
    participation_status = case
      when should_verify then 'confirmed'
      when a.participation_requested_at is not null then 'pending'
      else 'unverified'
    end,
    participation_requested_at = case
      when should_verify then coalesce(a.participation_requested_at, now())
      else a.participation_requested_at
    end,
    participation_confirmed_at = case when should_verify then now() else null end,
    participation_confirmed_by = case when should_verify then caller_id else null end,
    participation_confirmed_by_type = case when should_verify then 'school' else null end,
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

-- An organization may only confirm records tied to a listing it created. It
-- receives no permission to edit any other student portfolio data.
create or replace function public.set_organization_activity_verification(
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
    select 1 from public.profiles
    where id = caller_id and account_type = 'organization'
  ) then
    raise exception 'Not authorized';
  end if;

  update public.activities a
  set
    participation_status = case when should_verify then 'confirmed' else 'pending' end,
    participation_confirmed_at = case when should_verify then now() else null end,
    participation_confirmed_by = case when should_verify then caller_id else null end,
    participation_confirmed_by_type = case when should_verify then 'organization' else null end
  from public.opportunities o
  where a.id = activity_uuid
    and a.opportunity_id = o.id
    and o.created_by = caller_id
    and a.participation_status in ('pending', 'confirmed')
    and exists (
      select 1 from public.profiles p
      where p.id = a.user_id and p.account_type = 'student'
    )
  returning a.user_id into student_id;

  if student_id is null then
    raise exception 'This participation record is not available for your organization';
  end if;

  return student_id;
end;
$$;

-- The organization queue intentionally returns only the data needed to make a
-- participation decision. Reviews are never included or joined here.
create or replace function public.get_organization_participation_requests()
returns table (
  activity_id uuid,
  student_email text,
  opportunity_id uuid,
  opportunity_title text,
  activity_title text,
  activity_description text,
  activity_date date,
  requested_at timestamptz,
  participation_status text,
  confirmed_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null or not exists (
    select 1 from public.profiles
    where id = caller_id and account_type = 'organization'
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    a.id,
    p.email,
    o.id,
    o.title,
    a.title,
    a.description,
    a.date,
    a.participation_requested_at,
    a.participation_status,
    a.participation_confirmed_at
  from public.activities a
  join public.opportunities o on o.id = a.opportunity_id
  join public.profiles p on p.id = a.user_id
  where o.created_by = caller_id
    and a.participation_status in ('pending', 'confirmed')
    and p.account_type = 'student'
  order by
    case when a.participation_status = 'pending' then 0 else 1 end,
    a.participation_requested_at desc nulls last;
end;
$$;

revoke execute on function public.request_activity_participation_verification(uuid) from public, anon;
revoke execute on function public.set_school_activity_verification(uuid, boolean) from public, anon;
revoke execute on function public.set_organization_activity_verification(uuid, boolean) from public, anon;
revoke execute on function public.get_organization_participation_requests() from public, anon;
grant execute on function public.request_activity_participation_verification(uuid) to authenticated, service_role;
grant execute on function public.set_school_activity_verification(uuid, boolean) to authenticated, service_role;
grant execute on function public.set_organization_activity_verification(uuid, boolean) to authenticated, service_role;
grant execute on function public.get_organization_participation_requests() to authenticated, service_role;

-- Reviews are strictly for confirmed students. The trigger sets the visible
-- badge itself so clients cannot claim verification by changing a boolean.
create or replace function public.enforce_confirmed_participant_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.user_id and account_type = 'student'
  ) then
    raise exception 'Only student accounts can submit participant reviews';
  end if;

  if not exists (
    select 1 from public.activities
    where user_id = new.user_id
      and opportunity_id = new.opportunity_id
      and participation_status = 'confirmed'
  ) then
    raise exception 'Confirm your participation before sharing a review';
  end if;

  new.verified_participant := true;
  return new;
end;
$$;

drop trigger if exists trg_enforce_confirmed_participant_review on public.opportunity_reviews;
create trigger trg_enforce_confirmed_participant_review
  before insert or update on public.opportunity_reviews
  for each row execute function public.enforce_confirmed_participant_review();

drop policy if exists "Anyone can read reviews" on public.opportunity_reviews;
drop policy if exists "Authenticated users can submit review" on public.opportunity_reviews;
drop policy if exists "Users can update own review" on public.opportunity_reviews;
drop policy if exists "Users can delete own review" on public.opportunity_reviews;
drop policy if exists "Public and non-school users can read reviews" on public.opportunity_reviews;
drop policy if exists "Anyone can read reviews anonymously" on public.opportunity_reviews;
drop policy if exists "Non-school users can read reviews" on public.opportunity_reviews;
drop policy if exists "Confirmed students can submit reviews" on public.opportunity_reviews;
drop policy if exists "Confirmed students can update reviews" on public.opportunity_reviews;
drop policy if exists "Students can delete own reviews" on public.opportunity_reviews;

create policy "Anyone can read reviews anonymously"
  on public.opportunity_reviews for select
  to anon
  using (true);

create policy "Non-school users can read reviews"
  on public.opportunity_reviews for select
  to authenticated
  using (not public.is_school(auth.uid()));

create policy "Confirmed students can submit reviews"
  on public.opportunity_reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and account_type = 'student'
    )
    and exists (
      select 1 from public.activities
      where user_id = auth.uid()
        and opportunity_id = opportunity_reviews.opportunity_id
        and participation_status = 'confirmed'
    )
  );

create policy "Confirmed students can update reviews"
  on public.opportunity_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and account_type = 'student'
    )
    and exists (
      select 1 from public.activities
      where user_id = auth.uid()
        and opportunity_id = opportunity_reviews.opportunity_id
        and participation_status = 'confirmed'
    )
  );

create policy "Students can delete own reviews"
  on public.opportunity_reviews for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and account_type = 'student'
    )
  );

notify pgrst, 'reload schema';
