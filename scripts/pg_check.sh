#!/usr/bin/env bash
# Apply migrations + seeds to a throwaway Postgres 16 and exercise the SQL
# functions. Needs /usr/lib/postgresql/16 and a 'postgres' OS user.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN=/usr/lib/postgresql/16/bin
D=/var/lib/postgresql/raftcheck
PORT=54329
cleanup() { runuser -u postgres -- $PGBIN/pg_ctl -D $D/data stop >/dev/null 2>&1 || true; rm -rf $D; }
trap cleanup EXIT
rm -rf $D; mkdir -p $D; chown postgres:postgres $D
runuser -u postgres -- $PGBIN/initdb -D $D/data -U postgres -A trust >/dev/null
runuser -u postgres -- $PGBIN/pg_ctl -D $D/data -o "-p $PORT -k /tmp -c listen_addresses=''" -l $D/log -w start >/dev/null
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "create database raft;"
$PSQL -d raft <<'SQL'
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
create role authenticated nologin;
SQL
for f in "$ROOT"/supabase/migrations/*.sql; do
  sed 's/^create extension if not exists "pg_cron";/-- pg_cron skipped locally/' "$f" > $D/mig.sql
  if ! $PSQL -d raft -f $D/mig.sql; then echo "FAILED $(basename "$f")"; exit 1; fi; echo "applied $(basename "$f")"
done
$PSQL -d raft -f "$ROOT/supabase/seed.sql" && echo "seed ok"
$PSQL -d raft -f "$ROOT/supabase/seed_prompts.sql" && echo "prompts seeded: $($PSQL -d raft -Atc 'select count(*) from prompts')"
$PSQL -d raft -c "grant usage on schema public to authenticated; grant select, insert, update on all tables in schema public to authenticated; grant usage on all sequences in schema public to authenticated;"

# Fixture pair: A in London, B in Los Angeles.
$PSQL -d raft <<'SQL'
insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
insert into users (id, display_name, tz) values ('11111111-1111-1111-1111-111111111111','Eugene','Europe/London'),('22222222-2222-2222-2222-222222222222','Maya','America/Los_Angeles');
insert into pairs (id, mode, created_by, status) values ('33333333-3333-3333-3333-333333333333','couple','11111111-1111-1111-1111-111111111111','active');
insert into pair_members values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','creator'),('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','partner');
insert into habits (pair_id, user_id, title, kind, effective_from) values
 ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Gym','manual',current_date),
 ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','Run','manual',current_date);
insert into creatures (id, pair_id, season_id, species_id, tier) values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','S1','otter','common');
SQL

echo "--- SQL vs TS prompt selection"
$PSQL -d raft -At -F'|' -c "
select p, d, (today_prompt(p::uuid, 'crew', d::date)).pack, (today_prompt(p::uuid, 'crew', d::date)).sort
from (values ('33333333-3333-3333-3333-333333333333'),('44444444-4444-4444-4444-444444444444'),('9a1f6c2e-0b7d-4c3a-8e55-1d2f3a4b5c6d')) as pp(p),
     (values ('2026-10-17'),('2026-10-18'),('2026-12-31'),('2027-03-01')) as dd(d) order by 1,2" > $D/sql.txt
node --input-type=module -e '
import { pickPrompt, pairOffset } from "'"$ROOT"'/supabase/functions/_shared/prompts.ts";
const pairs=["33333333-3333-3333-3333-333333333333","44444444-4444-4444-4444-444444444444","9a1f6c2e-0b7d-4c3a-8e55-1d2f3a4b5c6d"];
const dates=["2026-10-17","2026-10-18","2026-12-31","2027-03-01"];
const out=[]; for (const p of pairs.sort()) for (const d of dates) { const r=pickPrompt("crew", d, pairOffset(p)); out.push(`${p}|${d}|${r.pack}|${r.sort}`); }
console.log(out.join("\n"));' > $D/ts.txt
if diff -u $D/sql.txt $D/ts.txt; then echo "prompt selection: SQL == TS (12 cases)"; else echo "MISMATCH"; exit 1; fi

echo "--- feed trigger enqueues N1 for the partner"
$PSQL -d raft -At <<'SQL'
insert into feeds (pair_id, user_id, habit_id, local_date, source, device_tz)
select '33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111', id, local_date_for('Europe/London'), 'manual', 'Europe/London' from habits where user_id='11111111-1111-1111-1111-111111111111';
select 'queue', user_id, code, payload from notification_queue;
SQL

echo "--- pair_view() as Eugene"
$PSQL -d raft -At <<'SQL'
set role authenticated;
select set_config('app.uid','11111111-1111-1111-1111-111111111111', false);
select jsonb_pretty(pair_view() - 'members' || jsonb_build_object('members', (select jsonb_agg(m - 'id') from jsonb_array_elements(pair_view()->'members') m)));
SQL
echo "--- pair_view() for a stranger"
$PSQL -d raft -At <<'SQL'
set role authenticated;
select set_config('app.uid','99999999-9999-9999-9999-999999999999', false);
select pair_view();
SQL
echo "PG CHECK OK"
