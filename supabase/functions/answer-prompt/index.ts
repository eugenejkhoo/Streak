// POST { text?, photoUrl? }  Answers today's prompt for the caller. Returns the
// partner's answer once both have answered.
import { bad, callerId, json, serviceClient } from "../_shared/http.ts";
import { localDateOf } from "../_shared/localDay.ts";

Deno.serve(async (req) => {
  const uid = await callerId(req);
  if (!uid) return bad("unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 280) : null;
  const photoUrl = typeof body.photoUrl === "string" ? body.photoUrl : null;
  if (!text && !photoUrl) return bad("empty");
  const db = serviceClient();

  const { data: user } = await db.from("users").select("tz").eq("id", uid).single();
  const { data: member } = await db.from("pair_members").select("pair_id, pairs(mode)").eq("user_id", uid).is("left_at", null).maybeSingle();
  if (!member) return bad("no_pair", 409);
  const localDate = localDateOf(new Date(), user?.tz ?? "UTC");
  const mode = (member as unknown as { pairs: { mode: "crew" | "couple" } }).pairs.mode;

  const { data: prompt } = await db.rpc("today_prompt", { p_pair: member.pair_id, p_mode: mode, p_date: localDate });
  if (!prompt?.id) return bad("no_prompt", 500);

  const { error } = await db.from("prompt_answers").insert({ pair_id: member.pair_id, prompt_id: prompt.id, user_id: uid, local_date: localDate, text, photo_url: photoUrl });
  if (error) return bad(error.code === "23505" ? "already_answered" : error.message, error.code === "23505" ? 200 : 500);

  const { data: partnerId } = await db.rpc("partner_of", { p_pair: member.pair_id, p_user: uid });
  const { data: partner } = partnerId
    ? await db.from("prompt_answers").select("text, photo_url").eq("pair_id", member.pair_id).eq("user_id", partnerId).eq("local_date", localDate).maybeSingle()
    : { data: null };
  await db.from("events").insert({ user_id: uid, pair_id: member.pair_id, name: "bond_answered", props: { pack: prompt.pack } });
  return json({ ok: true, localDate, revealed: !!partner, partnerAnswer: partner ?? null });
});
