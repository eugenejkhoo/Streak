// Supabase Edge Function: resolve closed pair days.
// Scheduled hourly by pg_cron (see migrations). Idempotent: only touches
// pair_days rows still in 'pending' whose window has closed, then expires
// at-risk days past their deadline.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { calendarDateIn, localDateOf, pairDayIsClosed } from "../_shared/localDay.ts";
import { syncExpedition } from "../_shared/expeditionSync.ts";
import {
  datesBetween,
  expireAtRisk,
  resolvePairDay,
  shieldCapFor,
  vitality,
  type DayRecord,
  type PairState,
} from "../_shared/resolve.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (_req) => {
  const now = new Date();
  const { data: pairs, error } = await supabase
    .from("pairs")
    .select("id, status, streak, streak_at_risk, at_risk_until, at_risk_date, shields, shield_cap, plus_until, empty_day_run, last_resolved_date, pair_members(user_id, users(tz))")
    .eq("status", "active");
  if (error) return new Response(error.message, { status: 500 });

  let resolved = 0;
  for (const p of pairs ?? []) {
    const members: { user_id: string; tz: string }[] = (p.pair_members as any[]).map((m) => ({
      user_id: m.user_id,
      tz: m.users?.tz ?? "UTC",
    }));
    if (members.length !== 2) continue;
    const tzs = members.map((m) => m.tz);

    const { data: creature } = await supabase
      .from("creatures")
      .select("id, growth_days, hibernating_since")
      .eq("pair_id", p.id)
      .is("graduated_at", null)
      .maybeSingle();
    if (!creature) continue;

    let state: PairState = {
      streak: p.streak,
      streakAtRisk: p.streak_at_risk ?? 0,
      atRiskUntil: p.at_risk_until ? new Date(p.at_risk_until) : null,
      atRiskDate: p.at_risk_date ?? null,
      shields: p.shields,
      shieldCap: shieldCapFor(!!p.plus_until && new Date(p.plus_until) > now),
      growth: creature.growth_days,
      emptyDayRun: p.empty_day_run ?? 0,
      hibernating: !!creature.hibernating_since,
    };

    // Candidate dates: from the day after the last resolved one up to the
    // earliest member's current local date, filtered to closed windows.
    const earliestToday = members
      .map((m) => localDateOf(now, m.tz))
      .sort()[0];
    const from = p.last_resolved_date ?? calendarDateIn(new Date(now.getTime() - 3 * 86_400_000), "UTC");
    const candidates = datesBetween(from, earliestToday).filter((d) => pairDayIsClosed(d, tzs, now));

    for (const date of candidates) {
      const [{ data: feeds }, { data: answers }, { data: treats }] = await Promise.all([
        supabase.from("feeds").select("user_id").eq("pair_id", p.id).eq("local_date", date),
        supabase.from("prompt_answers").select("user_id").eq("pair_id", p.id).eq("local_date", date),
        supabase.from("treats").select("id").eq("pair_id", p.id).eq("local_date", date).limit(1),
      ]);
      const fedBy = new Set((feeds ?? []).map((f: any) => f.user_id));
      const answeredBy = new Set((answers ?? []).map((a: any) => a.user_id));
      const [a, b] = members;

      const { state: next, day } = resolvePairDay(
        state,
        {
          date,
          fedA: fedBy.has(a.user_id),
          fedB: fedBy.has(b.user_id),
          bothAnsweredBond: answeredBy.has(a.user_id) && answeredBy.has(b.user_id),
          treatExchanged: (treats ?? []).length > 0,
        },
        now,
      );
      state = next;

      const { data: recent } = await supabase
        .from("pair_days")
        .select("score")
        .eq("pair_id", p.id)
        .lt("local_date", date)
        .order("local_date", { ascending: false })
        .limit(13);
      const scores = (recent ?? []).map((r: any) => r.score).reverse().concat(day.score);
      const { data: exp } = await supabase
        .from("expeditions")
        .select("completed_at")
        .eq("pair_id", p.id)
        .not("completed_at", "is", null)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      const v = vitality(scores, !!exp);

      await supabase.rpc("commit_pair_day", {
        p_pair_id: p.id,
        p_creature_id: creature.id,
        p_day: { ...day, vitality_after: v } satisfies DayRecord & { vitality_after: number },
        p_state: state,
      });
      resolved++;
    }

    await syncExpedition(supabase, p.id, [members[0].user_id, members[1].user_id], earliestToday).catch(() => {});

    // Expire at-risk days whose window passed.
    if (state.atRiskUntil && now > state.atRiskUntil && state.atRiskDate) {
      const { data: dayRow } = await supabase
        .from("pair_days")
        .select("*")
        .eq("pair_id", p.id)
        .eq("local_date", state.atRiskDate)
        .maybeSingle();
      if (dayRow && dayRow.state === "at_risk") {
        const { data: feeds } = await supabase.from("feeds").select("id").eq("pair_id", p.id).eq("local_date", dayRow.local_date).limit(1);
        const rec = expireAtRisk(state, dayRow as unknown as DayRecord, (feeds ?? []).length > 0, now);
        if (rec) {
          await supabase.rpc("commit_pair_day", { p_pair_id: p.id, p_creature_id: creature.id, p_day: rec.day, p_state: rec.state });
        }
      }
    }
  }

  return Response.json({ ok: true, resolved, at: now.toISOString() });
});
