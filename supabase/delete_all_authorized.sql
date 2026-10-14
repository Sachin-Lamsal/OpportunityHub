-- AUTHORIZED DESTRUCTIVE RESET — confirmed by user "YES - delete all"
DELETE FROM public.approval_queue;
DELETE FROM public.risk_flags;
DELETE FROM public.verification_evidence;
DELETE FROM public.audit_events;
DELETE FROM public.discovery_candidates;
DELETE FROM public.discovery_sources;
DELETE FROM public.discovery_jobs;
DELETE FROM public.opportunities;
DELETE FROM public.profiles WHERE publisher_type = 'official';
DELETE FROM public.admin_roles;
