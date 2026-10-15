-- =============================================================================
-- OpportunityHub — Publisher profiles and reviewed opportunity workflows
--
-- Run this after:
--   1. migration-discovery-verification-system.sql
--   2. migration-security-hardening.sql
--
-- This migration introduces separate publisher verification and opportunity
-- review states. It is re-runnable and keeps existing approved listings public.
-- =============================================================================

begin;

do $$
begin
  if to_regclass('public.admin_roles') is null then
    raise exception 'Run migration-discovery-verification-system.sql before this migration.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Public publisher profile details and publisher-level verification
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists website_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists publisher_verification_status text not null default 'unverified',
  add column if not exists publisher_verified_at timestamptz,
  add column if not exists publisher_verification_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_publisher_verification_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_publisher_verification_status_check
      check (publisher_verification_status in ('unverified', 'pending', 'verified', 'rejected'));
  end if;
end;
$$;

create index if not exists profiles_publisher_verification_status_idx
  on public.profiles (publisher_verification_status)
  where account_type in ('school', 'organization');

-- This view exposes only the fields intended for a public school or
-- organization profile. It deliberately excludes email, school membership,
-- and student data.
drop view if exists public.publisher_profiles;
create view public.publisher_profiles
with (security_barrier = true, security_invoker = false)
as
select
  id,
  account_type,
  organization_name,
  organization_description,
  school_code,
  contact_info,
  website_url,
  social_links,
  publisher_verification_status,
  publisher_verified_at,
  created_at
from public.profiles
where account_type in ('school', 'organization');

revoke all on public.publisher_profiles from public;
grant select on public.publisher_profiles to anon, authenticated;

-- The former public table policy exposed every column on school and
-- organization profiles, including email. Public pages now read from the
-- restricted view above; administrators retain table access for review work.
drop policy if exists "Anyone can view schools and organizations" on public.profiles;
drop policy if exists "Administrators can view profiles" on public.profiles;
create policy "Administrators can view profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

create or replace function public.guard_publisher_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.publisher_verification_status is not distinct from old.publisher_verification_status then
    return new;
  end if;

  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if auth.uid() = old.id
     and old.account_type in ('school', 'organization')
     and old.publisher_verification_status in ('unverified', 'rejected')
     and new.publisher_verification_status = 'pending' then
    return new;
  end if;

  raise exception 'Only an administrator can set a publisher verification decision';
end;
$$;

drop trigger if exists trg_guard_publisher_verification_status on public.profiles;
create trigger trg_guard_publisher_verification_status
  before update on public.profiles
  for each row execute function public.guard_publisher_verification_status();

create or replace function public.review_publisher_profile(
  publisher_id uuid,
  decision text,
  review_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access is required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  update public.profiles
  set
    publisher_verification_status = case when decision = 'approved' then 'verified' else 'rejected' end,
    publisher_verified_at = case when decision = 'approved' then now() else null end,
    publisher_verification_note = nullif(trim(review_notes), '')
  where id = publisher_id
    and account_type in ('school', 'organization')
    and publisher_verification_status = 'pending';

  if not found then
    raise exception 'Publisher is not awaiting verification';
  end if;

  return true;
end;
$$;

revoke execute on function public.review_publisher_profile(uuid, text, text) from public, anon;
grant execute on function public.review_publisher_profile(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Listing lifecycle and review records
-- ---------------------------------------------------------------------------

alter table public.opportunities
  add column if not exists lifecycle_status text,
  add column if not exists review_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists status_updated_at timestamptz not null default now();

-- Keep approved legacy listings visible. Existing rejected listings retain
-- their decision; older unverified listings move into the review queue.
update public.opportunities
set lifecycle_status = case
  when is_verified or verification_status = 'verified' then 'published'
  when verification_status = 'rejected' then 'rejected'
  else 'pending_review'
end
where lifecycle_status is null;

alter table public.opportunities
  alter column lifecycle_status set default 'draft',
  alter column lifecycle_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'opportunities_lifecycle_status_check'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_lifecycle_status_check
      check (lifecycle_status in (
        'draft', 'pending_review', 'published', 'rejected',
        'expired', 'cancelled', 'archived'
      ));
  end if;
end;
$$;

create index if not exists opportunities_lifecycle_status_idx
  on public.opportunities (lifecycle_status, created_at desc);

-- Publishers can write drafts, submit for review, or retire their own work.
-- Approval and rejection can only happen through the administrator RPC below.
create or replace function public.enforce_opportunity_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  -- Server-to-server maintenance and approved discovery imports use the
  -- service role. That key remains server-only and is not browser-accessible.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if caller_id is null then
    raise exception 'Authentication is required to change opportunity workflow state';
  end if;

  if public.is_admin(caller_id) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from caller_id then
      raise exception 'Publishers can only create listings for their own account';
    end if;

    if new.lifecycle_status not in ('draft', 'pending_review') then
      raise exception 'Publishers can only create drafts or submit listings for review';
    end if;
  else
    if caller_id is distinct from old.created_by then
      -- SECURITY DEFINER helpers may patch AI fields, but cannot change
      -- lifecycle or verification data for another publisher's listing.
      if new.lifecycle_status is distinct from old.lifecycle_status
         or new.is_verified is distinct from old.is_verified
         or new.verification_status is distinct from old.verification_status
         or new.verified_at is distinct from old.verified_at
         or new.verified_by is distinct from old.verified_by
         or new.created_by is distinct from old.created_by then
        raise exception 'Only the listing publisher or an administrator can change review data';
      end if;
      return new;
    end if;

    if new.created_by is distinct from old.created_by then
      raise exception 'A listing publisher cannot be changed';
    end if;

    if new.lifecycle_status not in ('draft', 'pending_review', 'cancelled', 'archived') then
      raise exception 'Publishers cannot set that listing status';
    end if;
  end if;

  new.is_verified := false;
  new.verification_status := 'unverified';
  new.verified_at := null;
  new.verified_by := null;

  if new.lifecycle_status = 'pending_review'
     and (tg_op = 'INSERT' or old.lifecycle_status is distinct from 'pending_review') then
    new.submitted_at := now();
  end if;

  if tg_op = 'UPDATE' and new.lifecycle_status is distinct from old.lifecycle_status then
    new.status_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_opportunity_workflow on public.opportunities;
create trigger trg_enforce_opportunity_workflow
  before insert or update on public.opportunities
  for each row execute function public.enforce_opportunity_workflow();

-- Replace permissive legacy policies. Authors can inspect their private work;
-- everyone else can see only current or historical public listings.
drop policy if exists "Anyone can view opportunities" on public.opportunities;
drop policy if exists "Authenticated users can view opportunities" on public.opportunities;
drop policy if exists "Public opportunity visibility" on public.opportunities;
drop policy if exists "Owner and admin opportunity visibility" on public.opportunities;
create policy "Public opportunity visibility"
  on public.opportunities for select
  to anon, authenticated
  using (lifecycle_status in ('published', 'expired', 'archived'));

create policy "Owner and admin opportunity visibility"
  on public.opportunities for select
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Schools and orgs can create opportunities" on public.opportunities;
create policy "Publishers can create draft listings"
  on public.opportunities for insert
  to authenticated
  with check (
    (
      public.can_manage_opportunities(auth.uid())
      and created_by = auth.uid()
      and lifecycle_status in ('draft', 'pending_review')
      and is_verified = false
      and verification_status = 'unverified'
    )
    or public.is_admin(auth.uid())
  );

drop policy if exists "Creators can update opportunities" on public.opportunities;
create policy "Publishers and administrators can update opportunities"
  on public.opportunities for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "Creators can delete opportunities" on public.opportunities;
create policy "Publishers can delete non-public drafts"
  on public.opportunities for delete
  to authenticated
  using (
    (created_by = auth.uid() and lifecycle_status in ('draft', 'rejected', 'cancelled'))
    or public.is_admin(auth.uid())
  );

create or replace function public.review_publisher_opportunity(
  opportunity_id uuid,
  decision text,
  review_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Administrator access is required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  update public.opportunities
  set
    lifecycle_status = case when decision = 'approved' then 'published' else 'rejected' end,
    is_verified = case when decision = 'approved' then true else false end,
    verification_status = case when decision = 'approved' then 'verified' else 'rejected' end,
    verified_at = case when decision = 'approved' then now() else null end,
    verified_by = case when decision = 'approved' then auth.uid() else null end,
    review_note = nullif(trim(review_notes), ''),
    status_updated_at = now()
  where id = opportunity_id
    and lifecycle_status = 'pending_review';

  if not found then
    raise exception 'Listing is not awaiting review';
  end if;

  return true;
end;
$$;

revoke execute on function public.review_publisher_opportunity(uuid, text, text) from public, anon;
grant execute on function public.review_publisher_opportunity(uuid, text, text) to authenticated, service_role;

-- Retire the legacy publisher self-verification functions. They remain for
-- compatibility with older clients, but now enforce the same admin-only rule.
create or replace function public.verify_opportunity(opp_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.review_publisher_opportunity(opp_id, 'approved', null);
end;
$$;

create or replace function public.reject_opportunity(opp_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.review_publisher_opportunity(opp_id, 'rejected', null);
end;
$$;

revoke execute on function public.verify_opportunity(uuid) from public, anon;
revoke execute on function public.reject_opportunity(uuid) from public, anon;
grant execute on function public.verify_opportunity(uuid) to authenticated, service_role;
grant execute on function public.reject_opportunity(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
