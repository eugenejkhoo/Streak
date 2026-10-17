// POST { mode: "crew" | "couple", displayName, tz }
// Creates a pending pair owned by the caller and returns the invite token.
import { inviteExpiry, inviteToken } from "../_shared/invite.ts";
import { bad, callerId, json, serviceClient } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const uid = await callerId(req);
  if (!uid) return bad("unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "couple" ? "couple" : body.mode === "crew" ? "crew" : null;
  if (!mode) return bad("mode");
  const db = serviceClient();

  // Upsert profile.
  await db.from("users").upsert({ id: uid, display_name: String(body.displayName ?? "Me").slice(0, 40), tz: body.tz ?? "UTC" });

  const { data: existing } = await db.from("pair_members").select("pair_id").eq("user_id", uid).is("left_at", null).maybeSingle();
  if (existing) return bad("already_paired", 409);

  const now = new Date();
  const token = inviteToken((n) => crypto.getRandomValues(new Uint8Array(n)));
  const { data: pair, error } = await db
    .from("pairs")
    .insert({ mode, created_by: uid, status: "pending", invite_token: token, invite_expires_at: inviteExpiry(now).toISOString() })
    .select("id")
    .single();
  if (error) return bad(error.message, 500);
  await db.from("pair_members").insert({ pair_id: pair.id, user_id: uid, role: "creator" });
  await db.from("events").insert({ user_id: uid, pair_id: pair.id, name: "pair_created", props: { mode } });
  return json({ ok: true, pairId: pair.id, inviteToken: token });
});
