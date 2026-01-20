-- Ascendia MVP schema (run in Supabase SQL editor)
-- This creates the profile + missions tables used by the Fastify API.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

-- Profiles: 1 row per auth user
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  timezone text not null default 'UTC',
  archetype_id text,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  level integer not null default 1,
  successful_days integer not null default 0,
  total_missions_completed integer not null default 0,
  last_success_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_archetype_id_idx on public.profiles(archetype_id);

-- Missions: 3–5 per day per user
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  type text not null,
  target_value integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint missions_status_check check (status in ('pending','completed','failed','skipped')),
  constraint missions_unique_per_day unique (user_id, date_key, type)
);

create index if not exists missions_user_date_idx on public.missions(user_id, date_key);

-- Progress log: optional MVP analytics support
create table if not exists public.progress_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  completed_missions integer not null default 0,
  failed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint progress_log_unique unique (user_id, date_key)
);

create index if not exists progress_log_user_date_idx on public.progress_log(user_id, date_key);

-- Keep updated_at current
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS (optional but recommended)
alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.progress_log enable row level security;

-- Default: client can read their own data, but cannot write.
-- Writes are performed by the Fastify API using the service role key.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

drop policy if exists "missions_select_own" on public.missions;
create policy "missions_select_own" on public.missions
for select using (auth.uid() = user_id);

drop policy if exists "progress_select_own" on public.progress_log;
create policy "progress_select_own" on public.progress_log
for select using (auth.uid() = user_id);
