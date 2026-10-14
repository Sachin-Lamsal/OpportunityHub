-- Per-user AI credit tracking (monthly reset)
-- Run in Supabase SQL Editor after complete-schema.sql

create table if not exists public.ai_user_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  premium_used int not null default 0 check (premium_used >= 0),
  standard_used int not null default 0 check (standard_used >= 0),
  basic_used int not null default 0 check (basic_used >= 0),
  reset_month text not null default to_char(timezone('utc', now()), 'YYYY-MM'),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.ai_user_usage enable row level security;

create policy "Users read own AI usage"
  on public.ai_user_usage for select
  using (auth.uid() = user_id);

create policy "Users insert own AI usage"
  on public.ai_user_usage for insert
  with check (auth.uid() = user_id);

create policy "Users update own AI usage"
  on public.ai_user_usage for update
  using (auth.uid() = user_id);
