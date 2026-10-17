// Cron every 5 minutes. Drains notification_queue through the push policy and APNs.
import { serviceClient, json } from "../_shared/http.ts";
import { copyFor, shouldSend, type NotificationCode } from "../_shared/notifications.ts";
import { sendPush } from "../_shared/apns.ts";

function localHHMM(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

Deno.serve(async () => {
  const db = serviceClient();
  const now = new Date();
  const { data: rows } = await db.from("notification_queue").select("*").is("sent_at", null).is("skipped_reason", null).order("created_at").limit(200);
  let sent = 0, skipped = 0;
  for (const q of rows ?? []) {
    const { data: u } = await db.from("users").select("tz, quiet_start, quiet_end").eq("id", q.user_id).single();
    const { data: today } = await db.from("notifications").select("code").eq("user_id", q.user_id).eq("pair_day", q.local_date);
    const verdict = shouldSend({
      code: q.code as NotificationCode,
      localHHMM: localHHMM(now, u?.tz ?? "UTC"),
      quiet: { start: u?.quiet_start?.slice(0, 5) ?? null, end: u?.quiet_end?.slice(0, 5) ?? null },
      sentToday: (today ?? []).map((t: { code: string }) => t.code as NotificationCode),
    });
    if (!verdict.send) {
      // Quiet hours: leave queued and retry later. Caps: drop.
      if (verdict.reason !== "quiet_hours") { await db.from("notification_queue").update({ skipped_reason: verdict.reason }).eq("id", q.id); skipped++; }
      continue;
    }
    const { title, body } = copyFor(q.code as NotificationCode, q.payload?.partnerName ?? "Your partner");
    const { data: tokens } = await db.from("device_tokens").select("token").eq("user_id", q.user_id);
    let delivered = false;
    for (const t of tokens ?? []) {
      const r = await sendPush({ deviceToken: t.token, title, body, collapseId: `${q.code}-${q.local_date}`, data: { code: q.code, pairId: q.pair_id } });
      if (r.ok) delivered = true;
      else if (r.status === 410 || r.reason === "BadDeviceToken") await db.from("device_tokens").delete().eq("token", t.token);
    }
    await db.from("notification_queue").update({ sent_at: now.toISOString(), skipped_reason: delivered ? null : "no_device" }).eq("id", q.id);
    if (delivered) { await db.from("notifications").insert({ user_id: q.user_id, code: q.code, pair_day: q.local_date }); sent++; }
  }
  return json({ ok: true, sent, skipped });
});
