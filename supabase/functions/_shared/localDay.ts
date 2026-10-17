/**
 * Local-day arithmetic.
 *
 * Every feed is stamped with the user's LOCAL DATE where the day boundary is
 * DAY_BOUNDARY_HOUR (03:00) local time, not midnight. A feed at 01:30 on the
 * 18th counts for the 17th. See docs/03-spec-v1.md section 2.
 *
 * Pure functions, no I/O. Shared by the Deno edge functions and the Node tests.
 */

export const DAY_BOUNDARY_HOUR = 3;

const MS_PER_HOUR = 3_600_000;

/** ISO date string, e.g. "2026-10-17". */
export type LocalDate = string;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(tz);
  if (!f) {
    // en-CA yields YYYY-MM-DD.
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatters.set(tz, f);
  }
  return f;
}

/** Calendar date (ignoring the 03:00 boundary) of an instant in a time zone. */
export function calendarDateIn(instant: Date, tz: string): LocalDate {
  return formatterFor(tz).format(instant);
}

/**
 * The local date a feed at `instant` belongs to, for a user in `tz`.
 * Shifting the instant back by the boundary hour and taking the calendar date
 * maps 03:00 local to 00:00 local, so [03:00 D, 03:00 D+1) -> D.
 */
export function localDateOf(
  instant: Date,
  tz: string,
  boundaryHour: number = DAY_BOUNDARY_HOUR,
): LocalDate {
  const shifted = new Date(instant.getTime() - boundaryHour * MS_PER_HOUR);
  return calendarDateIn(shifted, tz);
}

/** Parse "YYYY-MM-DD" into UTC components. */
export function parseLocalDate(d: LocalDate): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) throw new Error(`bad local date: ${d}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Add `n` days to a local date string. */
export function addDays(d: LocalDate, n: number): LocalDate {
  const { y, m, d: dd } = parseLocalDate(d);
  const t = Date.UTC(y, m - 1, dd + n);
  return new Date(t).toISOString().slice(0, 10);
}

/** Compare two local dates. Negative if a < b. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Offset of `tz` from UTC, in minutes, at a given instant.
 */
export function tzOffsetMinutes(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * The instant at which wall-clock time `hour:00` on calendar date `d` occurs in
 * `tz`. Two-pass offset correction handles DST on either side of the guess.
 * During a spring-forward gap the returned instant is the first valid moment
 * after the gap; during a fall-back overlap it is the earlier occurrence.
 */
export function instantOfLocalTime(d: LocalDate, hour: number, tz: string): Date {
  const { y, m, d: dd } = parseLocalDate(d);
  const wall = Date.UTC(y, m - 1, dd, hour, 0, 0);
  let guess = new Date(wall - tzOffsetMinutes(new Date(wall), tz) * 60_000);
  const second = new Date(wall - tzOffsetMinutes(guess, tz) * 60_000);
  if (second.getTime() !== guess.getTime()) guess = second;
  return guess;
}

/** Instant when local date `d` opens for a user in `tz` (03:00 local on d). */
export function localDayOpens(d: LocalDate, tz: string): Date {
  return instantOfLocalTime(d, DAY_BOUNDARY_HOUR, tz);
}

/** Instant when local date `d` closes for a user in `tz` (03:00 local on d+1). */
export function localDayCloses(d: LocalDate, tz: string): Date {
  return instantOfLocalTime(addDays(d, 1), DAY_BOUNDARY_HOUR, tz);
}

/**
 * A pair day D is open from the EARLIEST member's open to the LATEST member's
 * close. For London + Los Angeles that is a 32 hour window.
 */
export function pairDayWindow(d: LocalDate, tzs: readonly string[]): { opens: Date; closes: Date } {
  if (tzs.length === 0) throw new Error("pairDayWindow needs at least one tz");
  let opens = Infinity;
  let closes = -Infinity;
  for (const tz of tzs) {
    opens = Math.min(opens, localDayOpens(d, tz).getTime());
    closes = Math.max(closes, localDayCloses(d, tz).getTime());
  }
  return { opens: new Date(opens), closes: new Date(closes) };
}

/** True once every member's local day D has ended. */
export function pairDayIsClosed(d: LocalDate, tzs: readonly string[], now: Date): boolean {
  return now.getTime() >= pairDayWindow(d, tzs).closes.getTime();
}

/**
 * Anti-gaming: a client may only report a time zone change once per 24 hours.
 * Returns the tz the server should trust for stamping.
 */
export function trustedTimeZone(args: {
  storedTz: string;
  storedTzUpdatedAt: Date | null;
  reportedTz: string;
  now: Date;
}): { tz: string; accepted: boolean } {
  const { storedTz, storedTzUpdatedAt, reportedTz, now } = args;
  if (reportedTz === storedTz) return { tz: storedTz, accepted: false };
  const since = storedTzUpdatedAt ? now.getTime() - storedTzUpdatedAt.getTime() : Infinity;
  if (since >= 24 * MS_PER_HOUR) return { tz: reportedTz, accepted: true };
  return { tz: storedTz, accepted: false };
}
