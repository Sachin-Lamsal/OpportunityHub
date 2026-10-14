-- =============================================================================
-- Migration: Opportunity Ingestion, OCR, and Verification System
-- Run in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =============================================================================

-- 1. Add verification and ingestion columns to opportunities
alter table public.opportunities
  add column if not exists is_verified boolean not null default false,
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  add column if not exists source_type text not null default 'scraped'
    check (source_type in ('official', 'scraped', 'ocr', 'manual')),
  add column if not exists raw_source_text text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users (id) on delete set null;

-- 2. Create index on verification_status for fast filtering
create index if not exists opportunities_verification_status_idx
  on public.opportunities (verification_status);

create index if not exists opportunities_is_verified_idx
  on public.opportunities (is_verified);

-- 3. Mark existing curated / seeded opportunities as verified
update public.opportunities
set
  is_verified = true,
  verification_status = 'verified',
  source_type = 'official'
where is_verified is false;

-- 4. Ensure schools and organizations can update verification status
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

-- 5. RPC to easily verify an opportunity
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

grant execute on function public.verify_opportunity(uuid) to authenticated;

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

grant execute on function public.reject_opportunity(uuid) to authenticated;

-- 6. Reload schema cache
notify pgrst, 'reload schema';
