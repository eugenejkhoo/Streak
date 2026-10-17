// POST { kind: "free" | "paid", storeTxId? }
// Restores the at-risk day inside the 48h window. Free once per calendar month,
// paid at most twice per month. StoreKit receipt verification is a TODO: for
// now a paid restore requires a storeTxId and records it; verify server-side
// with App Store Server API before launch.
import { bad, callerId, json, serviceClient } from "../_shared/http.ts";
import { applyRestore, PAID_RESTORES_PER_MONTH, shieldCapFor, type DayRecord, type PairState } from "../_shared/resolve.ts";

Deno.serve(async (req) => {
  const uid = await callerId(req);
  if (!uid) return bad("unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "paid" ? "paid" : "free";
  const db = serviceClient();
  const now = new Date();
  const month = now.toISOString().slice(0, 7);

  const { data: member } = await db.from("pair_members").select("pair_id").eq("user_id", uid).is("left_at", null).maybeSingle();
  if (!member) return bad("no_pair", 409);
  const { data: p } = await db.from("pairs").select("*").eq("id", member.pair_id).single();
  if (!p?.at_risk_date) return bad("nothing_to_restore", 409);

  if (kind === "free" && p.free_restore_month === month) return bad("free_used", 409);
  if (kind === "paid") {
    if (!body.storeTxId) return bad("store_tx_required");
    const used = p.paid_restores_month === month ? p.paid_restores_count : 0;
    if (used >= PAID_RESTORES_PER_MONTH) return bad("paid_cap", 409);
  }

  const { data: dayRow } = await db.from("pair_days").select("*").eq("pair_id", p.id).eq("local_date", p.at_risk_date).single();
  const { data: creature } = await db.from("creatures").select("id, growth_days, hibernating_since").eq("pair_id", p.id).is("graduated_at", null).single();
  const [{ count: answers }, { count: treats }] = await Promise.all([
    db.from("prompt_answers").select("*", { count: "exact", head: true }).eq("pair_id", p.id).eq("local_date", p.at_risk_date),
    db.from("treats").select("*", { count: "exact", head: true }).eq("pair_id", p.id).eq("local_date", p.at_risk_date),
  ]);

  const state: PairState = {
    streak: p.streak, streakAtRisk: p.streak_at_risk, atRiskUntil: p.at_risk_until ? new Date(p.at_risk_until) : null,
    atRiskDate: p.at_risk_date, shields: p.shields, shieldCap: shieldCapFor(!!p.plus_until && new Date(p.plus_until) > now),
    growth: creature?.growth_days ?? 0, emptyDayRun: p.empty_day_run, hibernating: !!creature?.hibernating_since,
  };
  const day: DayRecord = {
    date: dayRow.local_date, state: dayRow.state, score: dayRow.score, streakAfter: dayRow.streak_after, growthAfter: dayRow.growth_after,
    shieldEarned: dayRow.shield_earned, shieldConsumed: dayRow.shield_consumed, stageBefore: "egg", stageAfter: "egg", hatchReady: false, hibernatingAfter: state.hibernating,
  };
  const r = applyRestore(state, day, (answers ?? 0) >= 2, (treats ?? 0) > 0, now);
  if (!r) return bad("window_closed", 409);

  await db.rpc("commit_pair_day", { p_pair_id: p.id, p_creature_id: creature!.id, p_day: { ...r.day, vitality_after: dayRow.vitality_after }, p_state: r.state });
  if (kind === "free") await db.from("pairs").update({ free_restore_month: month }).eq("id", p.id);
  else {
    const used = p.paid_restores_month === month ? p.paid_restores_count : 0;
    await db.from("pairs").update({ paid_restores_month: month, paid_restores_count: used + 1 }).eq("id", p.id);
    await db.from("purchases").insert({ pair_id: p.id, user_id: uid, product_id: "restore_099", store_tx_id: body.storeTxId, kind: "restore" });
  }
  await db.from("events").insert({ user_id: uid, pair_id: p.id, name: "restore_purchased", props: { kind } });
  return json({ ok: true, streak: r.state.streak });
});
