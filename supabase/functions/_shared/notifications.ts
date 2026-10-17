/**
 * Push policy. docs/03-spec-v1.md section 7.
 * Hard cap of 2 non-milestone pushes per member per day. Quiet hours respected.
 * Milestones (N4, N5) bypass the daily cap but not quiet hours.
 */

export type NotificationCode = "N1" | "N2" | "N3" | "N4" | "N5" | "N6" | "N7";

export const DAILY_CAP_NON_MILESTONE = 2;
export const MILESTONE_CODES: ReadonlySet<NotificationCode> = new Set(["N4", "N5"]);
/** Codes that may be sent at most once per local day. */
export const ONCE_PER_DAY: ReadonlySet<NotificationCode> = new Set(["N1", "N2", "N6"]);

export interface QuietHours {
  /** "HH:MM" local, or null */
  start: string | null;
  end: string | null;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** True if local wall time is inside quiet hours. Handles ranges that cross midnight. */
export function inQuietHours(localHHMM: string, q: QuietHours): boolean {
  if (!q.start || !q.end) return false;
  const t = minutes(localHHMM);
  const s = minutes(q.start);
  const e = minutes(q.end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

export interface SendCheck {
  code: NotificationCode;
  localHHMM: string;
  quiet: QuietHours;
  /** codes already sent to this user today (local day) */
  sentToday: readonly NotificationCode[];
}

export type SendVerdict = { send: true } | { send: false; reason: "quiet_hours" | "daily_cap" | "already_sent" };

export function shouldSend(c: SendCheck): SendVerdict {
  if (inQuietHours(c.localHHMM, c.quiet)) return { send: false, reason: "quiet_hours" };
  if (ONCE_PER_DAY.has(c.code) && c.sentToday.includes(c.code)) return { send: false, reason: "already_sent" };
  // N6 merges into N1: if N1 already went out today, N6 is redundant.
  if (c.code === "N6" && c.sentToday.includes("N1")) return { send: false, reason: "already_sent" };
  if (!MILESTONE_CODES.has(c.code)) {
    const nonMilestoneSent = c.sentToday.filter((x) => !MILESTONE_CODES.has(x)).length;
    if (nonMilestoneSent >= DAILY_CAP_NON_MILESTONE) return { send: false, reason: "daily_cap" };
  }
  return { send: true };
}

/** Creature-voiced copy. Never "ignoring". */
export function copyFor(code: NotificationCode, partnerName: string): { title: string; body: string } {
  switch (code) {
    case "N1":
      return { title: `${partnerName} fed me`, body: "No rush." };
    case "N2":
      return { title: "Day's almost done", body: "Still hungry." };
    case "N3":
      return { title: "We paused", body: "You have 48 hours if you want to pick it back up." };
    case "N4":
      return { title: "Something's happening", body: "Come look." };
    case "N5":
      return { title: "We did it", body: "Come see." };
    case "N6":
      return { title: `${partnerName} answered today's question`, body: "Your turn when you're ready." };
    case "N7":
      return { title: `Still waiting for ${partnerName}`, body: "Send the link again?" };
  }
}
