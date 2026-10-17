-- Bond prompt selection, notification queue, device tokens, pair_view().

-- ---------------------------------------------------------------- prompts ordering
alter table prompts add column if not exists sort int not null default 0;
create unique index if not exists prompts_mode_pack_sort on prompts(mode, pack, sort) where active;

-- ---------------------------------------------------------------- helpers
-- Local date with the 03:00 boundary. Mirrors localDateOf() in localDay.ts.
create or replace function local_date_for(p_tz text, p_at timestamptz default now()) returns date
language sql immutable as $$
  select ((p_at at time zone p_tz) - interval '3 hours')::date
$$;

-- Mirrors pairOffset() in prompts.ts: h = (h*31 + charCode) mod 2^32, then & 1023.
create or replace function pair_offset(p_pair uuid) returns int
language plpgsql immutable as $$
declare
  s text := p_pair::text;
  h bigint := 0;
  i int;
begin
  for i in 1..length(s) loop
    h := (h * 31 + ascii(substr(s, i, 1))) % 4294967296;
  end loop;
  return (h & 1023)::int;
end;
$$;

-- Mirrors pickPrompt() in prompts.ts.
create or replace function today_prompt(p_pair uuid, p_mode pair_mode, p_date date)
returns prompts language plpgsql stable as $$
declare
  packs text[] := case p_mode
    when 'crew' then array['plan','reflect','honest','hype','crewmate','wildcard']
    else array['appreciate','remember','ahead','play','knowme','today'] end;
  di bigint := (p_date - date '1970-01-01') + pair_offset(p_pair);
  pk text := packs[(di % 6) + 1];
  srt int := ((di / 6) % 20)::int;
  r prompts;
begin
  select * into r from prompts where mode = p_mode and pack = pk and sort = srt and active limit 1;
  return r;
end;
$$;

-- ---------------------------------------------------------------- device tokens
create table if not exists device_tokens (
  token      text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  platform   text not null default 'ios',
  sandbox    boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user on device_tokens(user_id);
alter table device_tokens enable row level security;
create policy device_tokens_own on device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- notification queue
create table if not exists notification_queue (
  id             bigserial primary key,
  user_id        uuid not null references users(id) on delete cascade,
  pair_id        uuid references pairs(id) on delete cascade,
  code           text not null,
  local_date     date not null,
  payload        jsonb not null default '{}',
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  skipped_reason text
);
create unique index if not exists notification_queue_dedupe on notification_queue(user_id, code, local_date) where code in ('N1','N2','N6','N7');
create index if not exists notification_queue_pending on notification_queue(created_at) where sent_at is null and skipped_reason is null;

-- Partner of a user in a pair.
create or replace function partner_of(p_pair uuid, p_user uuid) returns uuid
language sql stable as $$
  select user_id from pair_members where pair_id = p_pair and user_id <> p_user and left_at is null limit 1
$$;

-- N1: when A feeds and B has not fed that local date, queue N1 for B.
create or replace function feeds_enqueue_n1() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b uuid := partner_of(new.pair_id, new.user_id);
  a_name text;
begin
  if b is null then return new; end if;
  if exists (select 1 from feeds where pair_id = new.pair_id and user_id = b and local_date = new.local_date) then return new; end if;
  select display_name into a_name from users where id = new.user_id;
  insert into notification_queue (user_id, pair_id, code, local_date, payload)
  values (b, new.pair_id, 'N1', new.local_date, jsonb_build_object('partnerName', a_name))
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists feeds_enqueue_n1 on feeds;
create trigger feeds_enqueue_n1 after insert on feeds for each row execute function feeds_enqueue_n1();

-- N6: when A answers and B has not.
create or replace function answers_enqueue_n6() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b uuid := partner_of(new.pair_id, new.user_id);
  a_name text;
begin
  if b is null then return new; end if;
  if exists (select 1 from prompt_answers where pair_id = new.pair_id and user_id = b and local_date = new.local_date) then return new; end if;
  select display_name into a_name from users where id = new.user_id;
  insert into notification_queue (user_id, pair_id, code, local_date, payload)
  values (b, new.pair_id, 'N6', new.local_date, jsonb_build_object('partnerName', a_name))
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists answers_enqueue_n6 on prompt_answers;
create trigger answers_enqueue_n6 after insert on prompt_answers for each row execute function answers_enqueue_n6();

-- ---------------------------------------------------------------- pair_view()
-- Everything the home screen needs in one call, for the calling user.
create or replace function pair_view() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p pairs;
  c creatures;
  pr prompts;
  my_tz text;
  my_date date;
  members jsonb;
  my_answer text;
  partner_answer text;
  both_answered boolean;
  v int;
  ex expeditions;
begin
  select pa.* into p from pairs pa join pair_members pm on pm.pair_id = pa.id
   where pm.user_id = me and pm.left_at is null limit 1;
  if p.id is null then return jsonb_build_object('pair', null); end if;

  select tz into my_tz from users where id = me;
  my_date := local_date_for(coalesce(my_tz, 'UTC'));

  select jsonb_agg(jsonb_build_object(
      'id', u.id, 'display_name', u.display_name, 'tz', u.tz,
      'local_date', local_date_for(u.tz),
      'is_me', u.id = me,
      'fed_today', exists (select 1 from feeds f where f.pair_id = p.id and f.user_id = u.id and f.local_date = local_date_for(u.tz)),
      'answered_today', exists (select 1 from prompt_answers a where a.pair_id = p.id and a.user_id = u.id and a.local_date = local_date_for(u.tz)),
      'habit', (select jsonb_build_object('id', h.id, 'title', h.title, 'emoji', h.emoji, 'kind', h.kind, 'target_value', h.target_value)
                from habits h where h.pair_id = p.id and h.user_id = u.id and h.archived_at is null limit 1)
    ) order by pm.role)
    into members
    from pair_members pm join users u on u.id = pm.user_id
   where pm.pair_id = p.id and pm.left_at is null;

  select * into c from creatures where pair_id = p.id and graduated_at is null limit 1;
  select vitality_after into v from pair_days where pair_id = p.id and vitality_after is not null order by local_date desc limit 1;

  pr := today_prompt(p.id, p.mode, my_date);
  select text into my_answer from prompt_answers where pair_id = p.id and user_id = me and local_date = my_date;
  both_answered := my_answer is not null and exists (
    select 1 from prompt_answers where pair_id = p.id and user_id = partner_of(p.id, me) and local_date = my_date);
  if both_answered then
    select text into partner_answer from prompt_answers where pair_id = p.id and user_id = partner_of(p.id, me) and local_date = my_date;
  end if;

  select * into ex from expeditions where pair_id = p.id order by week_start desc limit 1;

  return jsonb_build_object(
    'pair', jsonb_build_object('id', p.id, 'mode', p.mode, 'status', p.status, 'streak', p.streak,
              'shields', p.shields, 'shield_cap', p.shield_cap, 'at_risk_until', p.at_risk_until,
              'at_risk_date', p.at_risk_date, 'plus_until', p.plus_until, 'invite_token', p.invite_token,
              'cosmetic_tokens', p.cosmetic_tokens),
    'members', coalesce(members, '[]'::jsonb),
    'creature', case when c.id is null then null else jsonb_build_object(
              'id', c.id, 'species_id', c.species_id, 'tier', c.tier, 'shiny', c.shiny, 'stage', c.stage,
              'growth_days', c.growth_days, 'hatch_ready_at', c.hatch_ready_at, 'hatched_at', c.hatched_at,
              'hibernating', c.hibernating_since is not null, 'adult_form', c.adult_form) end,
    'vitality', coalesce(v, 70),
    'today', my_date,
    'prompt', case when pr.id is null then null else jsonb_build_object('id', pr.id, 'pack', pr.pack, 'text', pr.text) end,
    'my_answer', my_answer,
    'partner_answer', partner_answer,
    'treats_today', (select count(*) from treats t where t.pair_id = p.id and t.local_date = my_date),
    'expedition', case when ex.id is null then null else jsonb_build_object(
              'template_id', ex.template_id, 'week_start', ex.week_start, 'progress_a', ex.progress_a,
              'progress_b', ex.progress_b, 'target', ex.target, 'completed_at', ex.completed_at) end
  );
end;
$$;

-- Mark the hatch as seen by the caller; returns true when both have seen it (or 24h passed).
create or replace function mark_hatch_seen(p_creature uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c creatures;
  done_both boolean;
begin
  select * into c from creatures where id = p_creature and is_pair_member(pair_id);
  if c.id is null or c.hatch_ready_at is null then return false; end if;
  update creatures set hatch_seen_by = array_append(array_remove(hatch_seen_by, auth.uid()), auth.uid()) where id = p_creature returning * into c;
  done_both := cardinality(c.hatch_seen_by) >= 2 or now() - c.hatch_ready_at > interval '24 hours';
  if done_both and c.hatched_at is null then update creatures set hatched_at = now() where id = p_creature; end if;
  return done_both;
end;
$$;

grant execute on function pair_view() to authenticated;
grant execute on function mark_hatch_seen(uuid) to authenticated;

create or replace function grant_cosmetic_tokens(p_pair uuid, p_n int) returns void
language sql security definer set search_path = public as $$
  update pairs set cosmetic_tokens = cosmetic_tokens + p_n where id = p_pair
$$;
