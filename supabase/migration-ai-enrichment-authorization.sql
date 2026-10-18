-- ---------------------------------------------------------------------------
-- AI enrichment authorization hardening
--
-- Problem: public.save_opportunity_ai_enrichment() is SECURITY DEFINER, so it
-- runs with the table owner's rights and bypasses Row Level Security. Its only
-- guard was `auth.uid() is not null`, which meant ANY signed-in account could
-- rewrite the publisher-owned facts of ANY listing (source_url, contact_info,
-- deadline, cost, location, tags, ...) on any opportunity id.
--
-- Fix: keep the AI-derived narrative columns writable for any signed-in user
-- (that is the documented per-opportunity "Generate AI details" feature), but
-- require ownership (or an administrator role) before any publisher fact column
-- may be changed.
--
-- Safe to re-run.
--
-- Order: apply AFTER migration-discovery-verification-system.sql, because the
-- function calls public.is_admin(). The application-side guard in
-- lib/actions/opportunity-enrich.ts is already active and does not depend on
-- this file, so this migration is defence in depth for the database itself.
-- ---------------------------------------------------------------------------

create or replace function public.save_opportunity_ai_enrichment(
  opp_id uuid,
  patch jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o public.opportunities%rowtype;
  k text;
  allowed text[] := array[
    'ai_summary',
    'prep_resources',
    'application_steps',
    'eligibility_details',
    'contact_info',
    'portfolio_tips',
    'ai_enriched_at',
    'source_url',
    'tags',
    'deadline',
    'start_date',
    'end_date',
    'cost',
    'time_commitment',
    'location',
    'grade_requirements',
    'skills_gained',
    'difficulty_level'
  ];
  -- Columns that describe the listing itself. Only the publisher who created
  -- the listing (or an administrator) may change them.
  owner_only text[] := array[
    'contact_info',
    'source_url',
    'tags',
    'deadline',
    'start_date',
    'end_date',
    'cost',
    'time_commitment',
    'location',
    'grade_requirements',
    'skills_gained',
    'difficulty_level'
  ];
  key_allowed boolean;
  is_owner boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into o from public.opportunities where id = opp_id;
  if not found then
    raise exception 'Opportunity not found';
  end if;

  if patch is null or patch = '{}'::jsonb then
    return false;
  end if;

  is_owner := (o.created_by is not null and o.created_by = uid)
              or public.is_admin(uid);

  for k in select jsonb_object_keys(patch)
  loop
    key_allowed := k = any(allowed);
    if not key_allowed then
      continue;
    end if;

    -- AI-derived narrative stays open to any signed-in user; publisher facts
    -- require ownership. Rows with a NULL created_by have no owner, so only an
    -- administrator may change their facts.
    if k = any(owner_only) and not is_owner then
      raise exception 'Only the publisher who created this listing can change %', k;
    end if;

    case k
      when 'ai_summary' then
        o.ai_summary := nullif(trim(both from patch->>'ai_summary'), '');
      when 'prep_resources' then
        o.prep_resources := nullif(trim(both from patch->>'prep_resources'), '');
      when 'application_steps' then
        o.application_steps := nullif(trim(both from patch->>'application_steps'), '');
      when 'eligibility_details' then
        o.eligibility_details := nullif(trim(both from patch->>'eligibility_details'), '');
      when 'contact_info' then
        o.contact_info := nullif(trim(both from patch->>'contact_info'), '');
      when 'portfolio_tips' then
        o.portfolio_tips := nullif(trim(both from patch->>'portfolio_tips'), '');
      when 'ai_enriched_at' then
        o.ai_enriched_at := (patch->>'ai_enriched_at')::timestamptz;
      when 'source_url' then
        o.source_url := nullif(trim(both from patch->>'source_url'), '');
      when 'tags' then
        if jsonb_typeof(patch->'tags') = 'array' then
          o.tags := array(
            select jsonb_array_elements_text(patch->'tags')
          );
        end if;
      when 'deadline' then
        o.deadline := nullif(patch->>'deadline', '')::date;
      when 'start_date' then
        o.start_date := nullif(patch->>'start_date', '')::date;
      when 'end_date' then
        o.end_date := nullif(patch->>'end_date', '')::date;
      when 'cost' then
        o.cost := nullif(trim(both from patch->>'cost'), '');
      when 'time_commitment' then
        o.time_commitment := nullif(trim(both from patch->>'time_commitment'), '');
      when 'location' then
        o.location := nullif(trim(both from patch->>'location'), '');
      when 'grade_requirements' then
        o.grade_requirements := nullif(trim(both from patch->>'grade_requirements'), '');
      when 'skills_gained' then
        o.skills_gained := nullif(trim(both from patch->>'skills_gained'), '');
      when 'difficulty_level' then
        o.difficulty_level := nullif(trim(both from patch->>'difficulty_level'), '');
      else
        null;
    end case;
  end loop;

  update public.opportunities
  set
    ai_summary = o.ai_summary,
    prep_resources = o.prep_resources,
    application_steps = o.application_steps,
    eligibility_details = o.eligibility_details,
    contact_info = o.contact_info,
    portfolio_tips = o.portfolio_tips,
    ai_enriched_at = o.ai_enriched_at,
    source_url = o.source_url,
    tags = o.tags,
    deadline = o.deadline,
    start_date = o.start_date,
    end_date = o.end_date,
    cost = o.cost,
    time_commitment = o.time_commitment,
    location = o.location,
    grade_requirements = o.grade_requirements,
    skills_gained = o.skills_gained,
    difficulty_level = o.difficulty_level
  where id = opp_id;

  return true;
end;
$$;

revoke execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) from public;
grant execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) to authenticated, service_role;

-- Verification (read-only, safe to run):
--   select public.is_admin(auth.uid());
--   select count(*) from public.opportunities where created_by is null;