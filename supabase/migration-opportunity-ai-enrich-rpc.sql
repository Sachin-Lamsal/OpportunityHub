-- =============================================================================
-- Migration: Safe RPC for student AI enrichment on opportunities
-- Lets authenticated users save AI-generated detail fields without broad UPDATE RLS.
-- Run after complete-schema / setup-all and migrate-opportunity-ai-fields.sql
-- =============================================================================

drop policy if exists "Authenticated users can enrich opportunities" on public.opportunities;

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
  key_allowed boolean;
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

  for k in select jsonb_object_keys(patch)
  loop
    key_allowed := k = any(allowed);
    if not key_allowed then
      continue;
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

grant execute on function public.save_opportunity_ai_enrichment(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
