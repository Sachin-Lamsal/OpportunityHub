-- School invite-only registration + org/school profile fields
-- Run after migrate-account-types.sql

alter table public.profiles
  add column if not exists contact_info text,
  add column if not exists organization_description text,
  add column if not exists students_invite_only boolean not null default false;

create table if not exists public.school_invite_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.profiles (id) on delete cascade,
  code text not null unique,
  label text,
  max_uses int not null default 1 check (max_uses > 0),
  use_count int not null default 0 check (use_count >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint school_invite_use_count_check check (use_count <= max_uses)
);

create index if not exists school_invite_codes_school_id_idx
  on public.school_invite_codes (school_id);

alter table public.school_invite_codes enable row level security;

drop policy if exists "Schools manage own invite codes" on public.school_invite_codes;
create policy "Schools manage own invite codes"
  on public.school_invite_codes for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and account_type = 'school'
        and school_invite_codes.school_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and account_type = 'school'
        and school_invite_codes.school_id = auth.uid()
    )
  );

create or replace function public.validate_school_invite(invite_code text)
returns table (school_id uuid, school_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := upper(trim(coalesce(invite_code, '')));
  if normalized = '' then
    return;
  end if;

  return query
  select p.id, p.organization_name
  from public.school_invite_codes ic
  join public.profiles p on p.id = ic.school_id and p.account_type = 'school'
  where ic.code = normalized
    and ic.active = true
    and ic.use_count < ic.max_uses
    and (ic.expires_at is null or ic.expires_at > now());
end;
$$;

create or replace function public.redeem_school_invite(invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  updated int;
begin
  normalized := upper(trim(coalesce(invite_code, '')));
  if normalized = '' then
    return false;
  end if;

  update public.school_invite_codes
  set use_count = use_count + 1
  where code = normalized
    and active = true
    and use_count < max_uses
    and (expires_at is null or expires_at > now());

  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

grant execute on function public.validate_school_invite(text) to anon, authenticated;
grant execute on function public.redeem_school_invite(text) to authenticated, service_role;

notify pgrst, 'reload schema';
