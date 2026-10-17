// Recompute this week's expedition row for a pair. Called from resolve-pair-days.
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { assignTemplate, progress, weekDates, weekStart } from "./expeditions.ts";
import { pairOffset } from "./prompts.ts";
import type { LocalDate } from "./localDay.ts";
import type { PairDayState } from "./resolve.ts";

export async function syncExpedition(db: SupabaseClient, pairId: string, memberIds: [string, string], today: LocalDate): Promise<void> {
  const start = weekStart(today);
  const dates = weekDates(start);
  const t = assignTemplate(start, pairOffset(pairId));
  const [{ data: days }, { data: answers }, { data: photos }] = await Promise.all([
    db.from("pair_days").select("local_date, state").eq("pair_id", pairId).in("local_date", dates),
    db.from("prompt_answers").select("user_id, local_date").eq("pair_id", pairId).in("local_date", dates),
    db.from("feeds").select("user_id, local_date").eq("pair_id", pairId).eq("source", "photo").in("local_date", dates),
  ]);
  const [a, b] = memberIds;
  const dayStates: Partial<Record<LocalDate, PairDayState>> = {};
  for (const d of days ?? []) dayStates[d.local_date] = d.state;
  const set = (rows: any[] | null, uid: string) => new Set((rows ?? []).filter((r) => r.user_id === uid).map((r) => r.local_date as LocalDate));
  const p = progress(t, start, { dayStates, answeredA: set(answers, a), answeredB: set(answers, b), photoA: set(photos, a), photoB: set(photos, b) });
  const { data: existing } = await db.from("expeditions").select("id, completed_at").eq("pair_id", pairId).eq("week_start", start).maybeSingle();
  const completed_at = existing?.completed_at ?? (p.completed ? new Date().toISOString() : null);
  await db.from("expeditions").upsert({ pair_id: pairId, week_start: start, template_id: t.id, progress_a: p.a, progress_b: p.b, target: p.target, completed_at }, { onConflict: "pair_id,week_start" });
  if (p.completed && !existing?.completed_at) {
    await db.rpc("grant_cosmetic_tokens", { p_pair: pairId, p_n: 1 }).then(() => {}, () => {});
    for (const uid of memberIds) {
      await db.from("notification_queue").insert({ user_id: uid, pair_id: pairId, code: "N5", local_date: today, payload: { kind: "expedition" } });
    }
  }
}
