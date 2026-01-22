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
  -- Used by the API to avoid repeatedly re-processing historical days.
  last_reconciled_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_archetype_id_idx on public.profiles(archetype_id);

-- Archetypes: mentor definitions (MVP)
create table if not exists public.archetypes (
  id text primary key,
  display_name text not null,
  description text not null,
  difficulty_multiplier numeric not null default 1.0,
  tone text not null,
  message_style text,
  message_templates jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists archetypes_sort_order_idx on public.archetypes(sort_order);

-- Seed MVP archetypes (idempotent)
insert into public.archetypes (
  id,
  display_name,
  description,
  difficulty_multiplier,
  tone,
  message_style,
  message_templates,
  sort_order
) values
(
  'shadow-ascendant',
  'Shadow Ascendant',
  'Ruthless discipline. No excuses. No negotiation.',
  1.2,
  'strict',
  'strict',
  jsonb_build_object(
    'missionAssigned', 'Your mission is set. Execute.',
    'eveningReminder', 'You are behind. Finish your missions.',
    'midnightFailure', 'Failure recorded. Return stronger tomorrow.'
  ),
  10
),
(
  'iron-sentinel',
  'Iron Sentinel',
  'Balanced structure. Consistency over intensity.',
  1.0,
  'calm',
  'calm',
  jsonb_build_object(
    'missionAssigned', 'Today’s missions are ready. Stay consistent.',
    'eveningReminder', 'You still have missions to complete.',
    'midnightFailure', 'Today is marked as failed. Reset and continue.'
  ),
  20
),
(
  'flame-vanguard',
  'Flame Vanguard',
  'Aggressive pace. Momentum is mandatory.',
  1.1,
  'aggressive',
  'aggressive',
  jsonb_build_object(
    'missionAssigned', 'Missions locked. Move now.',
    'eveningReminder', 'No hesitation. Finish what you started.',
    'midnightFailure', 'Deadline missed. Streak broken.'
  ),
  30
)
on conflict (id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  difficulty_multiplier = excluded.difficulty_multiplier,
  tone = excluded.tone,
  message_style = excluded.message_style,
  message_templates = excluded.message_templates,
  sort_order = excluded.sort_order;

-- Optional FK: profiles.archetype_id -> archetypes.id (idempotent)
do $$
begin
  -- If existing data has unknown archetype IDs, null them to avoid FK failures.
  update public.profiles p
    set archetype_id = null
    where p.archetype_id is not null
      and not exists (
        select 1 from public.archetypes a where a.id = p.archetype_id
      );

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_archetype_id_fkey'
  ) then
    -- NOT VALID avoids scanning existing rows until we explicitly validate.
    alter table public.profiles
      add constraint profiles_archetype_id_fkey
      foreign key (archetype_id)
      references public.archetypes(id)
      on delete set null
      not valid;
  end if;

  -- Validate once data is clean.
  if exists (
    select 1 from pg_constraint
      where conname = 'profiles_archetype_id_fkey'
        and convalidated = false
  ) then
    alter table public.profiles
      validate constraint profiles_archetype_id_fkey;
  end if;
end$$;

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

drop trigger if exists set_archetypes_updated_at on public.archetypes;
create trigger set_archetypes_updated_at
before update on public.archetypes
for each row execute function public.set_updated_at();

-- RLS (optional but recommended)
alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.progress_log enable row level security;
alter table public.archetypes enable row level security;

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

drop policy if exists "archetypes_select_all" on public.archetypes;
create policy "archetypes_select_all" on public.archetypes
for select using (true);
