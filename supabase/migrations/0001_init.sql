-- Raft v1 schema. See docs/03-spec-v1.md section 8.
-- Conventions: uuid PKs, timestamptz, local dates as DATE, RLS on every table
-- that a client can reach. Resolution and rolls run under the service role.

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

-- ---------------------------------------------------------------- enums
create type pair_mode as enum ('crew', 'couple');
create type pair_status as enum ('pending', 'active', 'solo', 'ended');
create type member_role as enum ('creator', 'partner');
create type habit_kind as enum ('manual', 'photo', 'health_workout', 'health_steps', 'health_sleep', 'health_mindful');
create type feed_source as enum ('manual', 'photo', 'health', 'override');
create type pair_day_state as enum ('pending', 'both_fed', 'shielded', 'at_risk', 'restored', 'missed_one', 'missed_none');
create type creature_tier as enum ('common', 'uncommon', 'rare', 'legendary');
create type creature_stage as enum ('egg', 'hatchling', 'juvenile', 'adolescent', 'adult');
create type adult_form as enum ('scrappy', 'standard', 'radiant', 'secret');
create type item_kind as enum ('hat', 'accessory', 'prop', 'theme');
create type purchase_kind as enum ('plus', 'restore', 'capsule', 'pass');

-- ---------------------------------------------------------------- users
create table users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  display_name        text not null check (char_length(display_name) between 1 and 40),
  avatar_url          text,
  tz                  text not null default 'UTC',
  tz_updated_at       timestamptz,
  reminder_local_time time not null default '21:00',
  quiet_start         time,
  quiet_end           time,
  health_enabled      boolean not null default false,
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

-- ---------------------------------------------------------------- seasons / species
create table seasons (
  id         text primary key,            -- 'S1'
  name       text not null,               -- 'Tidepool'
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  check (ends_at > starts_at)
);

create table species (
  id         text primary key,            -- 'otter'
  season_id  text not null references seasons(id),
  name       text not null,
  tier       creature_tier not null,
  art_key    text not null,
  sort       int not null default 0
);

-- ---------------------------------------------------------------- pairs
create table pairs (
  id                       uuid primary key default gen_random_uuid(),
  mode                     pair_mode not null,
  created_by               uuid not null references users(id),
  status                   pair_status not null default 'pending',
  invite_token             text unique,
  invite_expires_at        timestamptz,
  streak                   int not null default 0 check (streak >= 0),
  streak_at_risk           int not null default 0,
  at_risk_until            timestamptz,
  at_risk_date             date,
  shields                  int not null default 0 check (shields >= 0),
  shield_cap               int not null default 2,
  empty_day_run            int not null default 0,
  last_resolved_date       date,
  free_restore_month       text,           -- 'YYYY-MM' in which the free restore was used
  paid_restores_month      text,
  paid_restores_count      int not null default 0,
  plus_until               timestamptz,
  cosmetic_tokens          int not null default 0,
  capsule_opens_since_rare int not null default 0,
  created_at               timestamptz not null default now()
);

create table pair_members (
  pair_id    uuid not null references pairs(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role       member_role not null,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  primary key (pair_id, user_id)
);
-- One active pair per user in v1.
create unique index one_active_pair_per_user on pair_members(user_id) where left_at is null;

-- ---------------------------------------------------------------- habits
create table habits (
  id             uuid primary key default gen_random_uuid(),
  pair_id        uuid not null references pairs(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 60),
  emoji          text,
  kind           habit_kind not null default 'manual',
  target_value   numeric,                 -- steps, hours, minutes; null for manual/photo/workout
  effective_from date not null,
  archived_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index habits_active on habits(pair_id, user_id) where archived_at is null;

-- ---------------------------------------------------------------- feeds
create table feeds (
  id           uuid primary key default gen_random_uuid(),
  pair_id      uuid not null references pairs(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  habit_id     uuid references habits(id),
  local_date   date not null,
  source       feed_source not null,
  note         text check (char_length(note) <= 280),
  photo_url    text,
  health_value numeric,
  device_tz    text not null,
  created_at   timestamptz not null default now(),
  unique (pair_id, user_id, local_date)
);

-- ---------------------------------------------------------------- pair days
create table pair_days (
  pair_id         uuid not null references pairs(id) on delete cascade,
  local_date      date not null,
  state           pair_day_state not null default 'pending',
  score           int,
  vitality_after  int,
  streak_after    int,
  growth_after    int,
  shield_earned   boolean not null default false,
  shield_consumed boolean not null default false,
  resolved_at     timestamptz,
  primary key (pair_id, local_date)
);

-- ---------------------------------------------------------------- creatures
create table creatures (
  id                uuid primary key default gen_random_uuid(),
  pair_id           uuid not null references pairs(id) on delete cascade,
  season_id         text not null references seasons(id),
  species_id        text not null references species(id),
  tier              creature_tier not null,
  shiny             boolean not null default false,
  lucky_egg         boolean not null default false,
  stage             creature_stage not null default 'egg',
  growth_days       int not null default 0 check (growth_days >= 0),
  created_at        timestamptz not null default now(),
  hatch_ready_at    timestamptz,
  hatch_seen_by     uuid[] not null default '{}',
  hatched_at        timestamptz,
  adolescent_at     date,
  adult_form        adult_form,
  graduated_at      timestamptz,
  habitat_slot      int,
  hibernating_since timestamptz
);
create unique index one_live_creature_per_pair on creatures(pair_id) where graduated_at is null;

-- ---------------------------------------------------------------- bond
create table prompts (
  id      uuid primary key default gen_random_uuid(),
  mode    pair_mode not null,
  pack    text not null,
  text    text not null,
  active  boolean not null default true
);

create table prompt_answers (
  id         uuid primary key default gen_random_uuid(),
  pair_id    uuid not null references pairs(id) on delete cascade,
  prompt_id  uuid not null references prompts(id),
  user_id    uuid not null references users(id) on delete cascade,
  local_date date not null,
  text       text check (char_length(text) <= 280),
  photo_url  text,
  created_at timestamptz not null default now(),
  unique (pair_id, user_id, local_date)
);

create table treats (
  id         uuid primary key default gen_random_uuid(),
  pair_id    uuid not null references pairs(id) on delete cascade,
  from_user  uuid not null references users(id) on delete cascade,
  to_user    uuid not null references users(id) on delete cascade,
  feed_id    uuid references feeds(id) on delete set null,
  local_date date not null,
  kind       text not null,
  created_at timestamptz not null default now()
);
create index treats_by_day on treats(pair_id, local_date);

-- ---------------------------------------------------------------- expeditions
create table expeditions (
  id           uuid primary key default gen_random_uuid(),
  pair_id      uuid not null references pairs(id) on delete cascade,
  week_start   date not null,
  template_id  text not null,
  progress_a   int not null default 0,
  progress_b   int not null default 0,
  target       int not null,
  completed_at timestamptz,
  unique (pair_id, week_start)
);

-- ---------------------------------------------------------------- cosmetics / money
create table items (
  id        text primary key,
  kind      item_kind not null,
  season_id text references seasons(id),
  rarity    creature_tier not null default 'common',
  art_key   text not null
);

create table inventory (
  pair_id     uuid not null references pairs(id) on delete cascade,
  item_id     text not null references items(id),
  qty         int not null default 1,
  equipped_on text,                        -- creature id or habitat slot key
  primary key (pair_id, item_id)
);

create table purchases (
  id          uuid primary key default gen_random_uuid(),
  pair_id     uuid not null references pairs(id) on delete cascade,
  user_id     uuid not null references users(id),
  product_id  text not null,
  store_tx_id text not null unique,
  kind        purchase_kind not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- ops
create table notifications (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references users(id) on delete cascade,
  code     text not null,                  -- N1..N7
  pair_day date,
  sent_at  timestamptz not null default now()
);
create index notifications_cap on notifications(user_id, sent_at desc);

create table events (
  id         bigserial primary key,
  user_id    uuid,
  pair_id    uuid,
  name       text not null,
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
create or replace function is_pair_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from pair_members
    where pair_id = p and user_id = auth.uid() and left_at is null
  );
$$;

-- Atomic commit of one resolved pair day, called by the edge function.
create or replace function commit_pair_day(
  p_pair_id uuid, p_creature_id uuid, p_day jsonb, p_state jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into pair_days (pair_id, local_date, state, score, vitality_after, streak_after, growth_after, shield_earned, shield_consumed, resolved_at)
  values (
    p_pair_id, (p_day->>'date')::date, (p_day->>'state')::pair_day_state,
    (p_day->>'score')::int, (p_day->>'vitality_after')::int,
    (p_day->>'streakAfter')::int, (p_day->>'growthAfter')::int,
    coalesce((p_day->>'shieldEarned')::boolean, false),
    coalesce((p_day->>'shieldConsumed')::boolean, false), now()
  )
  on conflict (pair_id, local_date) do update set
    state = excluded.state, score = excluded.score, vitality_after = excluded.vitality_after,
    streak_after = excluded.streak_after, growth_after = excluded.growth_after,
    shield_earned = excluded.shield_earned, shield_consumed = excluded.shield_consumed,
    resolved_at = now();

  update pairs set
    streak = (p_state->>'streak')::int,
    streak_at_risk = (p_state->>'streakAtRisk')::int,
    at_risk_until = nullif(p_state->>'atRiskUntil', 'null')::timestamptz,
    at_risk_date = nullif(p_state->>'atRiskDate', 'null')::date,
    shields = (p_state->>'shields')::int,
    empty_day_run = (p_state->>'emptyDayRun')::int,
    last_resolved_date = greatest(coalesce(last_resolved_date, '1970-01-01'), (p_day->>'date')::date)
  where id = p_pair_id;

  update creatures set
    growth_days = (p_state->>'growth')::int,
    stage = (p_day->>'stageAfter')::creature_stage,
    hatch_ready_at = case when (p_day->>'hatchReady')::boolean and hatch_ready_at is null then now() else hatch_ready_at end,
    adolescent_at = case when (p_day->>'stageAfter') = 'adolescent' and adolescent_at is null then (p_day->>'date')::date else adolescent_at end,
    hibernating_since = case
      when (p_state->>'hibernating')::boolean and hibernating_since is null then now()
      when not (p_state->>'hibernating')::boolean then null
      else hibernating_since end
  where id = p_creature_id;
end;
$$;

-- ---------------------------------------------------------------- RLS
alter table users enable row level security;
alter table pairs enable row level security;
alter table pair_members enable row level security;
alter table habits enable row level security;
alter table feeds enable row level security;
alter table pair_days enable row level security;
alter table creatures enable row level security;
alter table prompts enable row level security;
alter table prompt_answers enable row level security;
alter table treats enable row level security;
alter table expeditions enable row level security;
alter table items enable row level security;
alter table inventory enable row level security;
alter table purchases enable row level security;
alter table seasons enable row level security;
alter table species enable row level security;

create policy users_self_read on users for select using (id = auth.uid() or exists (
  select 1 from pair_members a join pair_members b on a.pair_id = b.pair_id
  where a.user_id = auth.uid() and b.user_id = users.id and a.left_at is null and b.left_at is null));
create policy users_self_write on users for update using (id = auth.uid());
create policy users_self_insert on users for insert with check (id = auth.uid());

create policy pairs_member_read on pairs for select using (is_pair_member(id) or created_by = auth.uid());
create policy pairs_creator_insert on pairs for insert with check (created_by = auth.uid());

create policy members_read on pair_members for select using (is_pair_member(pair_id));

create policy habits_rw on habits for all using (is_pair_member(pair_id)) with check (user_id = auth.uid() and is_pair_member(pair_id));

create policy feeds_read on feeds for select using (is_pair_member(pair_id));
create policy feeds_insert on feeds for insert with check (user_id = auth.uid() and is_pair_member(pair_id));

create policy pair_days_read on pair_days for select using (is_pair_member(pair_id));
create policy creatures_read on creatures for select using (is_pair_member(pair_id));

create policy prompts_read on prompts for select using (active);
create policy answers_read on prompt_answers for select using (is_pair_member(pair_id));
create policy answers_insert on prompt_answers for insert with check (user_id = auth.uid() and is_pair_member(pair_id));

create policy treats_read on treats for select using (is_pair_member(pair_id));
create policy treats_insert on treats for insert with check (from_user = auth.uid() and is_pair_member(pair_id));

create policy expeditions_read on expeditions for select using (is_pair_member(pair_id));
create policy items_read on items for select using (true);
create policy inventory_read on inventory for select using (is_pair_member(pair_id));
create policy purchases_read on purchases for select using (is_pair_member(pair_id));
create policy seasons_read on seasons for select using (true);
create policy species_read on species for select using (true);

-- Joining a pair, accepting an invite, leaving, adoption, feeds via Health,
-- rolls and purchases all go through edge functions with the service role.

-- ---------------------------------------------------------------- cron
-- Hourly resolution. Replace <project-ref> and the service key in the vault.
-- select cron.schedule('resolve-pair-days', '7 * * * *', $$
--   select net.http_post(
--     url := 'https://<project-ref>.functions.supabase.co/resolve-pair-days',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key')))
-- $$);
