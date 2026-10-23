-- FormFit initial schema.
-- Every synced table has:
--   id uuid PK (client-generated, so offline writes are idempotent upserts)
--   user_id uuid → auth.users (cascade delete)
--   updated_at  client clock: last-write-wins (LWW) per record
--   synced_at   server clock: pull cursor (set by trigger on every write)
--   deleted_at  tombstone (deletes sync like updates)
-- Row Level Security is enabled on every table: users can only touch their own rows.

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.set_synced_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

-- LWW: an update carrying an older client timestamp than the stored row is ignored
-- (returning NULL from a BEFORE UPDATE trigger skips the row), which makes
-- retried / out-of-order uploads idempotent.
create or replace function public.lww_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable' using errcode = '42501';
  end if;
  return new;
end $$;

-- ── Tables ───────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  goal text check (char_length(goal) <= 60),
  fitness_level text check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  equipment text[] not null default '{}',
  days_per_week smallint check (days_per_week between 1 and 7),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_id_is_user check (id = user_id)
);

create table public.user_settings (
  id uuid primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_settings_id_is_user check (id = user_id)
);

create table public.plan_enrollments (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null check (char_length(plan_id) <= 80),
  status text not null check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null,
  current_day integer not null default 1 check (current_day >= 1),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workout_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text check (char_length(plan_id) <= 80),
  plan_day integer check (plan_day >= 1),
  mode text not null check (mode in ('guided', 'free', 'manual')),
  status text not null check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_s integer check (duration_s >= 0),
  total_reps integer not null default 0 check (total_reps >= 0),
  avg_quality smallint check (avg_quality between 0 and 100),
  calories_est integer check (calories_est >= 0),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) <= 60),
  set_index smallint not null check (set_index >= 0),
  target_reps smallint check (target_reps >= 0),
  reps smallint not null default 0 check (reps >= 0),
  target_seconds smallint check (target_seconds >= 0),
  held_seconds smallint check (held_seconds >= 0),
  avg_quality smallint check (avg_quality between 0 and 100),
  form_flags text[] not null default '{}',
  manual_adjustment smallint not null default 0,
  camera_tracked boolean not null default true,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ── Indexes (pull cursor + history queries) ──────────────────────────────────
create index profiles_sync_idx on public.profiles (user_id, synced_at);
create index user_settings_sync_idx on public.user_settings (user_id, synced_at);
create index plan_enrollments_sync_idx on public.plan_enrollments (user_id, synced_at);
create index workout_sessions_sync_idx on public.workout_sessions (user_id, synced_at);
create index workout_sessions_started_idx on public.workout_sessions (user_id, started_at desc);
create index workout_sets_sync_idx on public.workout_sets (user_id, synced_at);
create index workout_sets_session_idx on public.workout_sets (session_id);
create unique index plan_enrollments_one_active_idx
  on public.plan_enrollments (user_id) where status = 'active' and deleted_at is null;

-- ── Triggers ─────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles', 'user_settings', 'plan_enrollments', 'workout_sessions', 'workout_sets'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.lww_guard()', t || '_lww', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.set_synced_at()', t || '_synced_at', t);
  end loop;
end $$;

-- ── Row Level Security ───────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles', 'user_settings', 'plan_enrollments', 'workout_sessions', 'workout_sets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
    if t <> 'workout_sets' then
      execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    end if;
  end loop;
end $$;

-- Sets may only be attached to the caller's own sessions (FK checks bypass RLS).
create policy workout_sets_insert_own on public.workout_sets
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
  );
