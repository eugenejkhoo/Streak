// POST { kind }  One-tap acknowledgment of the partner's feed today.
import { bad, callerId, json, serviceClient } from "../_shared/http.ts";
import { localDateOf } from "../_shared/localDay.ts";

const KINDS = new Set(["fish", "shell", "pebble", "kelp", "star"]);

Deno.serve(async (req) => {
  const uid = await callerId(req);
  if (!uid) return bad("unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  if (!KINDS.has(body.kind)) return bad("kind");
  const db = serviceClient();
  const { data: user } = await db.from("users").select("tz").eq("id", uid).single();
  const { data: member } = await db.from("pair_members").select("pair_id").eq("user_id", uid).is("left_at", null).maybeSingle();
  if (!member) return bad("no_pair", 409);
  const { data: partnerId } = await db.rpc("partner_of", { p_pair: member.pair_id, p_user: uid });
  if (!partnerId) return bad("no_partner", 409);
  const localDate = localDateOf(new Date(), user?.tz ?? "UTC");
  const { data: feed } = await db.from("feeds").select("id").eq("pair_id", member.pair_id).eq("user_id", partnerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("treats").insert({ pair_id: member.pair_id, from_user: uid, to_user: partnerId, feed_id: feed?.id ?? null, local_date: localDate, kind: body.kind });
  if (error) return bad(error.message, 500);
  await db.from("events").insert({ user_id: uid, pair_id: member.pair_id, name: "treat_sent", props: { kind: body.kind } });
  return json({ ok: true });
});
