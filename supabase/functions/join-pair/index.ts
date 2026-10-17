// POST { token, displayName, tz }
// Joins the caller to a pending pair, activates it, creates the first egg.
import { canJoin } from "../_shared/invite.ts";
import { rollHatch } from "../_shared/resolve.ts";
import { bad, callerId, json, serviceClient } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const uid = await callerId(req);
  if (!uid) return bad("unauthorized", 401);
  const body = await req.json().catch(() => ({}));
  if (!body.token) return bad("token");
  const db = serviceClient();
  const now = new Date();

  await db.from("users").upsert({ id: uid, display_name: String(body.displayName ?? "Me").slice(0, 40), tz: body.tz ?? "UTC" });

  const { data: pair } = await db.from("pairs").select("id, status, created_by, invite_expires_at").eq("invite_token", body.token).maybeSingle();
  if (!pair) return bad("not_found", 404);
  const { count } = await db.from("pair_members").select("*", { count: "exact", head: true }).eq("pair_id", pair.id).is("left_at", null);
  const { data: mine } = await db.from("pair_members").select("pair_id").eq("user_id", uid).is("left_at", null).maybeSingle();

  const verdict = canJoin({
    pairStatus: pair.status,
    createdBy: pair.created_by,
    inviteExpiresAt: pair.invite_expires_at ? new Date(pair.invite_expires_at) : null,
    activeMemberCount: count ?? 0,
    joiningUserId: uid,
    joiningUserHasActivePair: !!mine,
    now,
  });
  if (!verdict.ok) return bad(verdict.reason, 409);

  await db.from("pair_members").insert({ pair_id: pair.id, user_id: uid, role: "partner" });
  await db.from("pairs").update({ status: "active", invite_token: null }).eq("id", pair.id);

  // First egg from the current season. Sealed roll; revealed at growth 3.
  const { data: season } = await db.from("seasons").select("id").lte("starts_at", now.toISOString()).gt("ends_at", now.toISOString()).maybeSingle();
  if (!season) return bad("no_active_season", 500);
  const roll = rollHatch(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32, false);
  const { data: candidates } = await db.from("species").select("id").eq("season_id", season.id).eq("tier", roll.tier);
  const species = candidates?.[Math.floor(Math.random() * (candidates?.length ?? 1))];
  if (!species) return bad("no_species_for_tier", 500);
  await db.from("creatures").insert({ pair_id: pair.id, season_id: season.id, species_id: species.id, tier: roll.tier, shiny: roll.shiny, lucky_egg: false });
  await db.from("events").insert({ user_id: uid, pair_id: pair.id, name: "invite_accepted" });
  return json({ ok: true, pairId: pair.id });
});
