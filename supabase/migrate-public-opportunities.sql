-- =============================================================================
-- Migration: Make opportunities readable by anyone (public/guest viewing)
-- Allows prospective students & visitors to browse opportunities before signing in.
-- Sign in is required only for saving/tracking, portfolio, and AI talks.
-- =============================================================================

grant select on public.opportunities to anon, authenticated;

drop policy if exists "Authenticated users can view opportunities" on public.opportunities;
drop policy if exists "Anyone can view opportunities" on public.opportunities;

create policy "Anyone can view opportunities"
  on public.opportunities for select
  to anon, authenticated
  using (true);

notify pgrst, 'reload schema';
