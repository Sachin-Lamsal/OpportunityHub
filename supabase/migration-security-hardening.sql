-- =============================================================================
-- OpportunityHub — Security hardening: function privilege least-privilege
--
-- Run in Supabase Dashboard -> SQL Editor -> New Query -> Run.
-- Re-runnable. Safe to run against an existing project.
--
-- WHY THIS EXISTS
-- ---------------
-- PostgreSQL grants EXECUTE on every function to PUBLIC by default. Supabase
-- additionally exposes these functions over PostgREST to the `anon` and
-- `authenticated` roles. Nothing in this project's migrations ever issued a
-- REVOKE, so every helper function was reachable by an UNAUTHENTICATED caller.
--
-- Two concrete problems this closes:
--
--  1. Student privacy. `get_student_school_id(uuid)` and
--     `is_school_of_student(uuid, uuid)` are SECURITY DEFINER, so they bypass
--     RLS on `profiles`. Granted to `anon`, they let ANY unauthenticated caller
--     ask "which school does student X belong to?" — a direct leak of a minor's
--     school affiliation.
--
--  2. Account enumeration. `check_email_exists(text)` is SECURITY DEFINER and
--     was granted to `anon`, letting anyone test whether an address is
--     registered. The application no longer calls it (see lib/actions/auth.ts),
--     so the grant is removed entirely.
--
-- WHAT IS NOT CHANGED
-- --------------------
--   * No table policies are altered.
--   * No data is modified.
--   * `service_role` keeps full access (it is needed by cron jobs).
--   * `anon` keeps access only to the two invite-lookup functions that the
--     pre-signup school-invite UI genuinely needs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper functions that must NOT be callable by an unauthenticated caller
-- -----------------------------------------------------------------------------

-- Student-affiliation helpers: leak which school a student belongs to.
revoke execute on function public.get_student_school_id(uuid) from public, anon;
revoke execute on function public.is_school_of_student(uuid, uuid) from public, anon;
grant  execute on function public.get_student_school_id(uuid) to authenticated, service_role;
grant  execute on function public.is_school_of_student(uuid, uuid) to authenticated, service_role;

-- Account enumeration oracle. No longer used by the application.
revoke execute on function public.check_email_exists(text) from public, anon, authenticated;

-- Admin/moderator role probes: allow authenticated callers, but not anon.
-- (They only read admin_roles, so impact is information disclosure of roles,
--  but there is no reason for an unauthenticated caller to invoke them.)
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.is_superadmin(uuid) from public, anon;
revoke execute on function public.is_moderator(uuid) from public, anon;
grant  execute on function public.is_admin(uuid) to authenticated;
grant  execute on function public.is_superadmin(uuid) to authenticated;
grant  execute on function public.is_moderator(uuid) to authenticated;

-- Profile role predicates. These gate the signup account-type flows, so they
-- stay available to authenticated sessions, but not to anon.
revoke execute on function public.get_profile_account_type(uuid) from public, anon;
revoke execute on function public.is_school(uuid) from public, anon;
revoke execute on function public.can_manage_opportunities(uuid) from public, anon;
grant  execute on function public.get_profile_account_type(uuid) to authenticated, service_role;
grant  execute on function public.is_school(uuid) to authenticated, service_role;
grant  execute on function public.can_manage_opportunities(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Mutating functions: authenticated callers only
-- -----------------------------------------------------------------------------
revoke execute on function public.redeem_school_invite(text) from public, anon;
revoke execute on function public.verify_opportunity(uuid) from public, anon;
revoke execute on function public.reject_opportunity(uuid) from public, anon;
revoke execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) from public, anon;
grant  execute on function public.redeem_school_invite(text) to authenticated, service_role;
grant  execute on function public.verify_opportunity(uuid) to authenticated, service_role;
grant  execute on function public.reject_opportunity(uuid) to authenticated, service_role;
grant  execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Explicitly retain anon access for the two pre-signup invite lookups.
--    These return only school name / invite validity, which the public signup
--    screen needs before an account exists.
-- -----------------------------------------------------------------------------
grant execute on function public.resolve_school_by_code(text) to anon, authenticated;
grant execute on function public.validate_school_invite(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Defensive: pin search_path on every SECURITY DEFINER function.
--    Without this, a SECURITY DEFINER function is vulnerable to search_path
--    hijacking if an attacker can create objects in a schema on the path.
--    Re-running this is harmless and self-correcting.
-- -----------------------------------------------------------------------------
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and (p.proconfig is null
           or not exists (
             select 1 from unnest(p.proconfig) cfg
             where cfg like 'search_path=%'
           ))
  loop
    execute format('alter function %s set search_path = public', fn.signature);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Verification helper (read-only). Run the SELECT below after applying.
--    Any row returned here means an EXECUTE privilege is still held by PUBLIC
--    or anon and should be investigated.
-- -----------------------------------------------------------------------------
-- select p.oid::regprocedure as function,
--        has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.prosecdef = true
--   and has_function_privilege('anon', p.oid, 'EXECUTE')
-- order by 1;