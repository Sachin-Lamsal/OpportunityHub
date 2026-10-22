-- ============================================================================
-- Migration: Allow students to add and manage opportunities
-- ============================================================================
-- This updates public.can_manage_opportunities to allow students, schools,
-- and organizations to submit opportunities for review.
-- Submitted opportunities will have lifecycle_status = 'pending_review'
-- and will appear in the admin queue (/admin/publisher-review) for approval.
-- ============================================================================

create or replace function public.can_manage_opportunities(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_uuid and account_type in ('school', 'organization', 'student')
  );
$$;

grant execute on function public.can_manage_opportunities(uuid) to authenticated, service_role;
