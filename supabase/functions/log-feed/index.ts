// POST { source, note?, photoUrl?, healthValue?, tz }
// Logs today's feed for the caller's active habit. Health sync calls this with source "health".
import { buildFeed } from "../_shared/feeds.ts";
import { bad, callerId, json, serviceClient } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const uid = await callerId(req);
  if (!uid) return bad("unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const db = serviceClient();
  const now = new Date();

  const { data: user } = await db.from("users").select("tz, tz_updated_at").eq("id", uid).single();
  const { data: member } = await db.from("pair_members").select("pair_id").eq("user_id", uid).is("left_at", null).maybeSingle();
  if (!member) return bad("no_pair", 409);
  const { data: habit } = await db.from("habits").select("id, user_id, kind, target_value").eq("pair_id", member.pair_id).eq("user_id", uid).is("archived_at", null).maybeSingle();
  if (!habit) return bad("no_habit", 409);
  const { data: existing } = await db.from("feeds").select("local_date").eq("pair_id", member.pair_id).eq("user_id", uid).gte("local_date", new Date(now.getTime() - 3 * 86_400_000).toISOString().slice(0, 10));

  const verdict = buildFeed({
    pairId: member.pair_id,
    userId: uid,
    habit: { id: habit.id, userId: habit.user_id, kind: habit.kind, targetValue: habit.target_value },
    source: body.source,
    note: body.note,
    photoUrl: body.photoUrl,
    healthValue: body.healthValue,
    reportedTz: body.tz ?? user?.tz ?? "UTC",
    storedTz: user?.tz ?? "UTC",
    storedTzUpdatedAt: user?.tz_updated_at ? new Date(user.tz_updated_at) : null,
    now,
    existingLocalDates: new Set((existing ?? []).map((e: { local_date: string }) => e.local_date)),
  });
  if (!verdict.ok) return bad(verdict.reason, verdict.reason === "duplicate" ? 200 : 400);

  const { tz_changed, ...row } = verdict.row;
  const { error } = await db.from("feeds").insert(row);
  if (error) return bad(error.message, 500);
  if (tz_changed) await db.from("users").update({ tz: row.device_tz, tz_updated_at: now.toISOString() }).eq("id", uid);
  await db.from("events").insert({ user_id: uid, pair_id: member.pair_id, name: "feed_logged", props: { source: row.source } });
  // N1 to the partner is dispatched by a DB trigger or a follow-up function; out of scope here.
  return json({ ok: true, localDate: row.local_date });
});
