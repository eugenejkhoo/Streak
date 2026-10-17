/**
 * Weekly pair challenges. docs/03 section 6.6.
 * Week runs Monday to Sunday on local dates. Progress is computed from the
 * week's pair_days, feeds and answers; the edge function upserts the row.
 */

import { addDays, parseLocalDate, type LocalDate } from "./localDay.ts";
import type { PairDayState } from "./resolve.ts";

export type Metric = "both_fed_days" | "both_answered_days" | "same_day_photo" | "both_fed_run";

export interface Template {
  id: string;
  title: string;
  metric: Metric;
  target: number;
}

export const TEMPLATES: readonly Template[] = [
  { id: "feed5", title: "Both feed 5 of 7 days", metric: "both_fed_days", target: 5 },
  { id: "answer4", title: "Both answer 4 questions", metric: "both_answered_days", target: 4 },
  { id: "photo_same_day", title: "Both send a photo feed on the same day", metric: "same_day_photo", target: 1 },
  { id: "run3", title: "Both fed 3 days in a row", metric: "both_fed_run", target: 3 },
];

/** Monday of the week containing `d`. */
export function weekStart(d: LocalDate): LocalDate {
  const { y, m, d: dd } = parseLocalDate(d);
  const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); // 0 Sun .. 6 Sat
  const back = (dow + 6) % 7;
  return addDays(d, -back);
}

export function weekDates(start: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Rotate templates by week so a pair sees each one in turn, offset per pair. */
export function assignTemplate(start: LocalDate, offset: number): Template {
  const { y, m, d } = parseLocalDate(start);
  const weekIndex = Math.floor(Date.UTC(y, m - 1, d) / (7 * 86_400_000));
  return TEMPLATES[(weekIndex + offset) % TEMPLATES.length];
}

export interface WeekFacts {
  /** state per date, in date order, missing = pending */
  dayStates: Partial<Record<LocalDate, PairDayState>>;
  /** dates each member answered the prompt */
  answeredA: ReadonlySet<LocalDate>;
  answeredB: ReadonlySet<LocalDate>;
  /** dates each member logged a photo feed */
  photoA: ReadonlySet<LocalDate>;
  photoB: ReadonlySet<LocalDate>;
}

export interface Progress {
  a: number;
  b: number;
  /** pair-level progress toward target */
  pair: number;
  target: number;
  completed: boolean;
}

export function progress(t: Template, start: LocalDate, f: WeekFacts): Progress {
  const dates = weekDates(start);
  let a = 0, b = 0, pair = 0;
  switch (t.metric) {
    case "both_fed_days":
      pair = dates.filter((d) => f.dayStates[d] === "both_fed").length;
      a = b = pair;
      break;
    case "both_answered_days":
      a = dates.filter((d) => f.answeredA.has(d)).length;
      b = dates.filter((d) => f.answeredB.has(d)).length;
      pair = dates.filter((d) => f.answeredA.has(d) && f.answeredB.has(d)).length;
      break;
    case "same_day_photo":
      a = dates.filter((d) => f.photoA.has(d)).length;
      b = dates.filter((d) => f.photoB.has(d)).length;
      pair = dates.filter((d) => f.photoA.has(d) && f.photoB.has(d)).length;
      break;
    case "both_fed_run": {
      let run = 0, best = 0;
      for (const d of dates) {
        run = f.dayStates[d] === "both_fed" ? run + 1 : 0;
        best = Math.max(best, run);
      }
      pair = best;
      a = b = best;
      break;
    }
  }
  const capped = Math.min(pair, t.target);
  return { a: Math.min(a, t.target), b: Math.min(b, t.target), pair: capped, target: t.target, completed: capped >= t.target };
}
