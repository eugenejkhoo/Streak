/**
 * Feed ingestion rules. Pure logic.
 * docs/03-spec-v1.md sections 2, 6.3, 6.4.
 */

import { localDateOf, trustedTimeZone, type LocalDate } from "./localDay.ts";

export type HabitKind = "manual" | "photo" | "health_workout" | "health_steps" | "health_sleep" | "health_mindful";
export type FeedSource = "manual" | "photo" | "health" | "override";

export interface Habit {
  id: string;
  userId: string;
  kind: HabitKind;
  /** steps, hours of sleep, mindful minutes; null for manual/photo/workout */
  targetValue: number | null;
}

export function isHealthKind(kind: HabitKind): boolean {
  return kind.startsWith("health_");
}

/**
 * Does a Health sample satisfy the habit?
 * workout: any value > 0 (minutes). steps: >= target. sleep: hours >= target.
 * mindful: minutes >= target.
 */
export function healthMeetsTarget(kind: HabitKind, value: number, target: number | null): boolean {
  if (!Number.isFinite(value) || value < 0) return false;
  switch (kind) {
    case "health_workout":
      return value > 0;
    case "health_steps":
    case "health_sleep":
    case "health_mindful":
      return target !== null && value >= target;
    default:
      return false;
  }
}

export interface FeedRequest {
  pairId: string;
  userId: string;
  habit: Habit;
  source: FeedSource;
  note?: string | null;
  photoUrl?: string | null;
  healthValue?: number | null;
  /** tz the client reports right now */
  reportedTz: string;
  storedTz: string;
  storedTzUpdatedAt: Date | null;
  now: Date;
  /** local dates this user already has a feed for in this pair */
  existingLocalDates: ReadonlySet<LocalDate>;
}

export interface FeedRow {
  pair_id: string;
  user_id: string;
  habit_id: string;
  local_date: LocalDate;
  source: FeedSource;
  note: string | null;
  photo_url: string | null;
  health_value: number | null;
  device_tz: string;
  /** true when the server accepted a tz change on this request */
  tz_changed: boolean;
}

export type FeedVerdict =
  | { ok: true; row: FeedRow }
  | { ok: false; reason: "not_your_habit" | "photo_required" | "health_below_target" | "bad_source" | "duplicate" | "note_too_long" };

export const NOTE_MAX = 280;

export function buildFeed(r: FeedRequest): FeedVerdict {
  if (r.habit.userId !== r.userId) return { ok: false, reason: "not_your_habit" };
  if (r.note && r.note.length > NOTE_MAX) return { ok: false, reason: "note_too_long" };

  const k = r.habit.kind;
  switch (r.source) {
    case "manual":
      if (k !== "manual") return { ok: false, reason: "bad_source" };
      break;
    case "photo":
      if (k !== "photo" && k !== "manual") return { ok: false, reason: "bad_source" };
      if (!r.photoUrl) return { ok: false, reason: "photo_required" };
      break;
    case "health":
      if (!isHealthKind(k)) return { ok: false, reason: "bad_source" };
      if (r.healthValue == null || !healthMeetsTarget(k, r.healthValue, r.habit.targetValue)) {
        return { ok: false, reason: "health_below_target" };
      }
      break;
    case "override":
      // "Log it anyway" for a Health habit. Marked as override in the memory book.
      if (!isHealthKind(k)) return { ok: false, reason: "bad_source" };
      break;
  }
  if (k === "photo" && !r.photoUrl) return { ok: false, reason: "photo_required" };

  const { tz, accepted } = trustedTimeZone({
    storedTz: r.storedTz,
    storedTzUpdatedAt: r.storedTzUpdatedAt,
    reportedTz: r.reportedTz,
    now: r.now,
  });
  const local_date = localDateOf(r.now, tz);
  if (r.existingLocalDates.has(local_date)) return { ok: false, reason: "duplicate" };

  return {
    ok: true,
    row: {
      pair_id: r.pairId,
      user_id: r.userId,
      habit_id: r.habit.id,
      local_date,
      source: r.source,
      note: r.note ?? null,
      photo_url: r.photoUrl ?? null,
      health_value: r.healthValue ?? null,
      device_tz: tz,
      tz_changed: accepted,
    },
  };
}
