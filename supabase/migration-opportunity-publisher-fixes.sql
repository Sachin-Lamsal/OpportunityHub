-- =============================================================================
-- Migration: Publisher ownership for verify/reject, drop duplicate title index,
-- tighten opportunity UPDATE RLS (verify/reject use RPCs).
-- =============================================================================

drop index if exists public.opportunities_title_key;

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

notify pgrst, 'reload schema';
