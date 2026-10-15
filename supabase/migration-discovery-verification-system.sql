-- =============================================================================
-- OpportunityHub Discovery, Verification, Approval, and Audit System
-- Run in Supabase Dashboard -> SQL Editor -> New Query -> Run
--
-- Re-runnable: policies are dropped before creation, tables use IF NOT EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADMIN ROLES TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'superadmin')),
  created_at timestamptz not null default now(),
  notes text
);

comment on table public.admin_roles is 'Tracks which users have admin/moderator privileges';
create index if not exists admin_roles_user_id_idx on public.admin_roles (user_id);
create index if not exists admin_roles_role_idx on public.admin_roles (role);

alter table public.admin_roles enable row level security;

-- ---------------------------------------------------------------------------
-- 1b. HELPER FUNCTIONS (after admin_roles exists; SQL bodies are validated at
--     creation, so the table above must come first)
-- ---------------------------------------------------------------------------
-- These are SECURITY DEFINER and owned by the table owner, so RLS on
-- admin_roles is bypassed inside them. Policies MUST call these instead of
-- inlining `select ... from admin_roles`, which causes:
--   "infinite recursion detected in policy for relation admin_roles".

create or replace function public.is_admin(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = user_uuid
      and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = user_uuid
      and role = 'superadmin'
  );
$$;

create or replace function public.is_moderator(user_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = user_uuid
      and role in ('admin', 'moderator', 'superadmin')
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_superadmin(uuid) to authenticated;
grant execute on function public.is_moderator(uuid) to authenticated;

drop policy if exists "Admin roles visible to admins and superadmins" on public.admin_roles;
create policy "Admin roles visible to admins and superadmins"
  on public.admin_roles for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
  );

drop policy if exists "Only superadmins can manage admin roles" on public.admin_roles;
create policy "Only superadmins can manage admin roles"
  on public.admin_roles for all
  to authenticated
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. DISCOVERY SOURCES REGISTRY
-- ---------------------------------------------------------------------------
create table if not exists public.discovery_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source_type text not null check (source_type in ('website', 'rss', 'facebook', 'search', 'user_submitted', 'other')),
  base_url text,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_scan_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  success_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.discovery_sources is 'Registry of opportunity sources (websites, RSS, Facebook, etc.)';
create index if not exists discovery_sources_active_idx on public.discovery_sources (is_active);
create index if not exists discovery_sources_type_idx on public.discovery_sources (source_type);

alter table public.discovery_sources enable row level security;

drop policy if exists "Public sources visible to all, but only admins can modify" on public.discovery_sources;
create policy "Public sources visible to all, but only admins can modify"
  on public.discovery_sources for select
  to anon
  using (is_active = true);

drop policy if exists "Authenticated users can view all sources" on public.discovery_sources;
create policy "Authenticated users can view all sources"
  on public.discovery_sources for select
  to authenticated
  using (true);

drop policy if exists "Only admins can manage sources" on public.discovery_sources;
create policy "Only admins can manage sources"
  on public.discovery_sources for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. DISCOVERY CANDIDATES TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.discovery_sources (id) on delete set null,
  original_url text not null unique,
  title text not null,
  description text,
  extracted_at timestamptz not null default now(),
  raw_content text,
  source_data jsonb not null default '{}'::jsonb,

  -- Extracted opportunity fields
  organizer text,
  deadline text,
  start_date text,
  end_date text,
  location text,
  is_online boolean,
  subject_area text,
  grade_requirements text,
  cost text,
  contact_info text,
  registration_link text,

  -- Candidate status
  status text not null default 'new' check (status in ('new', 'processing', 'verification_pending', 'approved', 'rejected', 'archived')),
  duplicate_of_id uuid references public.discovery_candidates (id) on delete set null,

  -- Processing metadata
  extraction_confidence real,
  processing_notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.discovery_candidates is 'Raw discovered opportunities awaiting verification and approval';
create index if not exists discovery_candidates_source_id_idx on public.discovery_candidates (source_id);
create index if not exists discovery_candidates_status_idx on public.discovery_candidates (status);
create index if not exists discovery_candidates_original_url_idx on public.discovery_candidates (original_url);
create index if not exists discovery_candidates_duplicate_of_idx on public.discovery_candidates (duplicate_of_id);

alter table public.discovery_candidates enable row level security;

drop policy if exists "Only admins and moderators can view candidates" on public.discovery_candidates;
create policy "Only admins and moderators can view candidates"
  on public.discovery_candidates for select
  to authenticated
  using (public.is_moderator(auth.uid()));

drop policy if exists "Only admins can manage candidates" on public.discovery_candidates;
create policy "Only admins can manage candidates"
  on public.discovery_candidates for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. VERIFICATION EVIDENCE TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.discovery_candidates (id) on delete cascade,
  claim text not null,
  evidence_type text not null check (evidence_type in ('organizer_official', 'website', 'third_party', 'social_media', 'search_result', 'other')),
  source_url text,
  source_title text,
  evidence_excerpt text,
  verdict text not null check (verdict in ('supports', 'contradicts', 'neutral', 'inconclusive')),
  confidence real,
  retrieved_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.verification_evidence is 'Supporting or contradicting evidence for candidate opportunity claims';
create index if not exists verification_evidence_candidate_idx on public.verification_evidence (candidate_id);
create index if not exists verification_evidence_verdict_idx on public.verification_evidence (verdict);

alter table public.verification_evidence enable row level security;

drop policy if exists "Only admins can view/manage evidence" on public.verification_evidence;
create policy "Only admins can view/manage evidence"
  on public.verification_evidence for all
  to authenticated
  using (public.is_moderator(auth.uid()))
  with check (public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. RISK FLAGS TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.risk_flags (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.discovery_candidates (id) on delete cascade,
  flag_type text not null check (flag_type in ('missing_deadline', 'suspicious_url', 'organizer_unverified', 'contradicted_claim', 'potential_fraud', 'expired', 'duplicate', 'low_confidence', 'other')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null,
  suggested_action text,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now()
);

comment on table public.risk_flags is 'Suspicious or problematic markers on discovery candidates';
create index if not exists risk_flags_candidate_idx on public.risk_flags (candidate_id);
create index if not exists risk_flags_type_idx on public.risk_flags (flag_type);
create index if not exists risk_flags_severity_idx on public.risk_flags (severity);
create index if not exists risk_flags_resolved_idx on public.risk_flags (is_resolved);

alter table public.risk_flags enable row level security;

drop policy if exists "Only admins can view/manage flags" on public.risk_flags;
create policy "Only admins can view/manage flags"
  on public.risk_flags for all
  to authenticated
  using (public.is_moderator(auth.uid()))
  with check (public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. AUDIT EVENTS TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('discover', 'extract', 'verify', 'flag', 'approve', 'reject', 'publish', 'unpublish', 'edit', 'remove', 'resolve_flag', 'admin_login', 'other')),
  actor_id uuid references auth.users (id) on delete set null,
  actor_type text check (actor_type in ('admin', 'system', 'student', 'school', 'organization')),
  target_type text check (target_type in ('candidate', 'opportunity', 'flag', 'source', 'verification')),
  target_id uuid,
  details jsonb,
  success boolean not null default true,
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.audit_events is 'Immutable audit trail of all significant system actions';
create index if not exists audit_events_actor_idx on public.audit_events (actor_id);
create index if not exists audit_events_action_idx on public.audit_events (action);
create index if not exists audit_events_target_idx on public.audit_events (target_type, target_id);
create index if not exists audit_events_created_at_idx on public.audit_events (created_at);

alter table public.audit_events enable row level security;

drop policy if exists "Only admins can view audit events" on public.audit_events;
create policy "Only admins can view audit events"
  on public.audit_events for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Audit events cannot be directly modified by users (only append is allowed).
drop policy if exists "Audit events are append-only" on public.audit_events;
create policy "Audit events are append-only"
  on public.audit_events for insert
  to authenticated
  with check (
    public.is_admin(auth.uid())
    or actor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 7. APPROVAL QUEUE TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.discovery_candidates (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'rejected', 'needs_revision')),
  assigned_to uuid references auth.users (id) on delete set null,
  priority integer not null default 0,
  review_notes text,
  reviewer_id uuid references auth.users (id) on delete set null,
  decision_at timestamptz,
  unresolved_flags_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.approval_queue is 'Approval workflow for discovered candidates';
create index if not exists approval_queue_status_idx on public.approval_queue (status);
create index if not exists approval_queue_assigned_to_idx on public.approval_queue (assigned_to);
create index if not exists approval_queue_priority_idx on public.approval_queue (priority desc);

alter table public.approval_queue enable row level security;

drop policy if exists "Only admins can view/manage approval queue" on public.approval_queue;
create policy "Only admins can view/manage approval queue"
  on public.approval_queue for all
  to authenticated
  using (public.is_moderator(auth.uid()))
  with check (public.is_moderator(auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. DISCOVERY JOBS TABLE (for tracking scan runs)
-- ---------------------------------------------------------------------------
create table if not exists public.discovery_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.discovery_sources (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed', 'aborted')),
  candidates_discovered integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

comment on table public.discovery_jobs is 'History of discovery scan runs for audit and monitoring';
create index if not exists discovery_jobs_source_idx on public.discovery_jobs (source_id);
create index if not exists discovery_jobs_status_idx on public.discovery_jobs (status);
create index if not exists discovery_jobs_created_at_idx on public.discovery_jobs (created_at desc);

alter table public.discovery_jobs enable row level security;

drop policy if exists "Only admins can view discovery jobs" on public.discovery_jobs;
create policy "Only admins can view discovery jobs"
  on public.discovery_jobs for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 9. OFFICIAL PUBLISHER ACCOUNT (system identity)
-- ---------------------------------------------------------------------------
-- Add publisher_type to profiles if needed
alter table public.profiles
  add column if not exists publisher_type text check (publisher_type in ('official') or publisher_type is null);

-- Mark the official OpportunityHub account (will be created separately)
-- This is a special account that publishes approved opportunities

-- ---------------------------------------------------------------------------
-- 10. RELOAD SCHEMA
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
