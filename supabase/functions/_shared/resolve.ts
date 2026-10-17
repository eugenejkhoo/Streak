/**
 * Pair-day resolution, streaks, shields, vitality, stages and adult forms.
 * Pure domain logic. See docs/03-spec-v1.md sections 3 to 5.
 *
 * Nothing here touches a database. The edge function loads state, calls these,
 * and writes the results back in one transaction.
 */

import { addDays, type LocalDate } from "./localDay.ts";

// ---------------------------------------------------------------------------
// Constants (tunable, keep in one place)
// ---------------------------------------------------------------------------

export const SHIELD_EVERY_N_DAYS = 7;
export const SHIELD_CAP_FREE = 2;
export const SHIELD_CAP_PLUS = 5;
export const RESTORE_WINDOW_HOURS = 48;
export const PAID_RESTORES_PER_MONTH = 2;
export const HIBERNATE_AFTER_EMPTY_DAYS = 7;

export const VITALITY_WINDOW_DAYS = 14;
export const VITALITY_PRIOR = 70;
export const EXPEDITION_BONUS = 5;

export const SCORE_BOTH_FED = 65;
export const SCORE_BOND = 25;
export const SCORE_TREATS = 10;
export const SCORE_SHIELDED_FLAT = 30;
export const SCORE_ONE_FED_FLAT = 20;

/** Growth-day thresholds for each stage. */
export const STAGE_THRESHOLDS = {
  hatchling: 3,
  juvenile: 14,
  adolescent: 45,
  adult: 100,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PairDayState =
  | "pending"
  | "both_fed"
  | "shielded"
  | "at_risk"
  | "restored"
  | "missed_one"
  | "missed_none";

export type Stage = "egg" | "hatchling" | "juvenile" | "adolescent" | "adult";
export type AdultForm = "scrappy" | "standard" | "radiant" | "secret";
export type Tier = "common" | "uncommon" | "rare" | "legendary";

export interface PairState {
  streak: number;
  /** Streak value parked while a day is at risk. */
  streakAtRisk: number;
  /** Deadline for restoring the at-risk day, or null. */
  atRiskUntil: Date | null;
  /** Local date of the at-risk day, or null. */
  atRiskDate: LocalDate | null;
  shields: number;
  shieldCap: number;
  /** Growth days of the CURRENT creature. Never decreases. */
  growth: number;
  /** Consecutive pair days with zero feeds from either member. */
  emptyDayRun: number;
  hibernating: boolean;
}

export interface DayInput {
  date: LocalDate;
  fedA: boolean;
  fedB: boolean;
  bothAnsweredBond: boolean;
  treatExchanged: boolean;
}

export interface DayRecord {
  date: LocalDate;
  state: PairDayState;
  score: number;
  streakAfter: number;
  growthAfter: number;
  shieldEarned: boolean;
  shieldConsumed: boolean;
  stageBefore: Stage;
  stageAfter: Stage;
  /** Set when the creature crossed into hatchling this day. Hatch is gated on both members opening the app. */
  hatchReady: boolean;
  hibernatingAfter: boolean;
}

export interface Resolution {
  state: PairState;
  day: DayRecord;
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export function stageForGrowth(growth: number): Stage {
  if (growth >= STAGE_THRESHOLDS.adult) return "adult";
  if (growth >= STAGE_THRESHOLDS.adolescent) return "adolescent";
  if (growth >= STAGE_THRESHOLDS.juvenile) return "juvenile";
  if (growth >= STAGE_THRESHOLDS.hatchling) return "hatchling";
  return "egg";
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function dayScore(state: PairDayState, bond: boolean, treats: boolean): number {
  let base: number;
  switch (state) {
    case "both_fed":
      base = SCORE_BOTH_FED;
      break;
    case "shielded":
    case "restored":
      base = SCORE_SHIELDED_FLAT;
      break;
    case "missed_one":
    case "at_risk":
      // at_risk is scored as the underlying miss; recomputed on restore/expiry.
      base = SCORE_ONE_FED_FLAT;
      break;
    case "missed_none":
      base = 0;
      break;
    case "pending":
      throw new Error("cannot score a pending day");
  }
  return Math.min(100, base + (bond ? SCORE_BOND : 0) + (treats ? SCORE_TREATS : 0));
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve one closed pair day. Caller guarantees the window has closed and the
 * day is still pending. `resolvedAt` is "now" for the restore deadline.
 */
export function resolvePairDay(prev: PairState, input: DayInput, resolvedAt: Date): Resolution {
  const s: PairState = { ...prev };
  const stageBefore = stageForGrowth(prev.growth);
  let state: PairDayState;
  let shieldEarned = false;
  let shieldConsumed = false;

  const anyFed = input.fedA || input.fedB;
  const bothFed = input.fedA && input.fedB;

  if (bothFed) {
    state = "both_fed";
    s.streak += 1;
    s.growth += 1;
    if (s.streak % SHIELD_EVERY_N_DAYS === 0 && s.shields < s.shieldCap) {
      s.shields += 1;
      shieldEarned = true;
    }
  } else if (s.shields > 0) {
    state = "shielded";
    s.shields -= 1;
    shieldConsumed = true;
  } else if (s.streak > 0) {
    state = "at_risk";
    s.streakAtRisk = s.streak;
    s.atRiskDate = input.date;
    s.atRiskUntil = new Date(resolvedAt.getTime() + RESTORE_WINDOW_HOURS * 3_600_000);
    s.streak = 0;
  } else {
    // Nothing to protect. Record the miss plainly.
    state = anyFed ? "missed_one" : "missed_none";
  }

  // Hibernation tracks EMPTY days (neither fed), independent of shields.
  if (anyFed) {
    s.emptyDayRun = 0;
    if (bothFed) s.hibernating = false;
  } else {
    s.emptyDayRun += 1;
    if (s.emptyDayRun >= HIBERNATE_AFTER_EMPTY_DAYS) s.hibernating = true;
  }

  const stageAfter = stageForGrowth(s.growth);
  const score =
    state === "at_risk"
      ? dayScore(anyFed ? "missed_one" : "missed_none", input.bothAnsweredBond, input.treatExchanged)
      : dayScore(state, input.bothAnsweredBond, input.treatExchanged);

  return {
    state: s,
    day: {
      date: input.date,
      state,
      score,
      streakAfter: s.streak,
      growthAfter: s.growth,
      shieldEarned,
      shieldConsumed,
      stageBefore,
      stageAfter,
      hatchReady: stageBefore === "egg" && stageAfter !== "egg",
      hibernatingAfter: s.hibernating,
    },
  };
}

/**
 * Restore an at-risk day (free monthly restore or a paid one). Returns null if
 * there is nothing to restore or the window has passed.
 */
export function applyRestore(
  prev: PairState,
  day: DayRecord,
  bond: boolean,
  treats: boolean,
  now: Date,
): Resolution | null {
  if (day.state !== "at_risk") return null;
  if (!prev.atRiskUntil || now.getTime() > prev.atRiskUntil.getTime()) return null;
  if (prev.atRiskDate !== day.date) return null;
  const s: PairState = {
    ...prev,
    streak: prev.streakAtRisk,
    streakAtRisk: 0,
    atRiskUntil: null,
    atRiskDate: null,
  };
  return {
    state: s,
    day: {
      ...day,
      state: "restored",
      score: dayScore("restored", bond, treats),
      streakAfter: s.streak,
    },
  };
}

/**
 * Expire an at-risk day whose restore window has passed. The paused streak is
 * gone; the day becomes a plain miss. Growth is untouched.
 */
export function expireAtRisk(prev: PairState, day: DayRecord, anyFed: boolean, now: Date): Resolution | null {
  if (day.state !== "at_risk") return null;
  if (!prev.atRiskUntil || now.getTime() <= prev.atRiskUntil.getTime()) return null;
  const s: PairState = { ...prev, streakAtRisk: 0, atRiskUntil: null, atRiskDate: null };
  return {
    state: s,
    day: { ...day, state: anyFed ? "missed_one" : "missed_none", streakAfter: s.streak },
  };
}

// ---------------------------------------------------------------------------
// Vitality
// ---------------------------------------------------------------------------

/**
 * Vitality over the most recent `VITALITY_WINDOW_DAYS` resolved scores.
 * `recentScores` is oldest -> newest and may be shorter than the window; the
 * missing days are filled with the neutral prior so a new egg starts at 70.
 */
export function vitality(recentScores: readonly number[], expeditionCompleted: boolean): number {
  const window = recentScores.slice(-VITALITY_WINDOW_DAYS);
  const missing = VITALITY_WINDOW_DAYS - window.length;
  const sum = window.reduce((a, b) => a + b, 0) + missing * VITALITY_PRIOR;
  const mean = sum / VITALITY_WINDOW_DAYS;
  const v = mean + (expeditionCompleted ? EXPEDITION_BONUS : 0);
  return Math.max(0, Math.min(100, Math.round(v)));
}

export type VitalityBand = "droopy" | "normal" | "bright" | "glowing";

export function vitalityBand(v: number): VitalityBand {
  if (v > 90) return "glowing";
  if (v >= 70) return "bright";
  if (v >= 40) return "normal";
  return "droopy";
}

/** The creature explores overnight if yesterday scored at least 90. */
export function exploresOvernight(yesterdayScore: number): boolean {
  return yesterdayScore >= 90;
}

// ---------------------------------------------------------------------------
// Adult form
// ---------------------------------------------------------------------------

/**
 * Adult form from the pair days between reaching adolescent and reaching adult.
 * `dailyVitality` is V as recorded on each of those days; `states` are the
 * day states for the same period. Shields count as misses.
 */
export function adultForm(dailyVitality: readonly number[], states: readonly PairDayState[]): AdultForm {
  if (dailyVitality.length === 0) return "standard";
  const avgV = dailyVitality.reduce((a, b) => a + b, 0) / dailyVitality.length;
  const misses = states.filter((s) => s !== "both_fed").length;
  if (avgV > 85 && misses === 0) return "secret";
  if (avgV > 85) return "radiant";
  if (avgV >= 50) return "standard";
  return "scrappy";
}

// ---------------------------------------------------------------------------
// Hatch roll
// ---------------------------------------------------------------------------

export const TIER_ODDS: Record<Tier, number> = {
  common: 0.6,
  uncommon: 0.25,
  rare: 0.12,
  legendary: 0.03,
};

export const LUCKY_MULTIPLIER = 1.5;
export const SHINY_ODDS = 1 / 100;

export interface HatchRoll {
  tier: Tier;
  shiny: boolean;
  lucky: boolean;
}

/**
 * Roll tier and shiny. `rng` returns [0, 1). Injected so tests are deterministic
 * and so the server can use crypto randomness. `lucky` is true when the pair's
 * previous creature graduated radiant or secret: rare and legendary odds are
 * multiplied by 1.5 and common absorbs the difference.
 */
export function rollHatch(rng: () => number, lucky: boolean): HatchRoll {
  let odds = { ...TIER_ODDS };
  if (lucky) {
    const rare = TIER_ODDS.rare * LUCKY_MULTIPLIER;
    const legendary = TIER_ODDS.legendary * LUCKY_MULTIPLIER;
    const delta = rare + legendary - TIER_ODDS.rare - TIER_ODDS.legendary;
    odds = { ...odds, rare, legendary, common: TIER_ODDS.common - delta };
  }
  const r = rng();
  let acc = 0;
  let tier: Tier = "common";
  for (const t of ["legendary", "rare", "uncommon", "common"] as const) {
    acc += odds[t];
    if (r < acc) {
      tier = t;
      break;
    }
  }
  const shiny = rng() < SHINY_ODDS;
  return { tier, shiny, lucky };
}

// ---------------------------------------------------------------------------
// Helpers for the edge function
// ---------------------------------------------------------------------------

/** Dates from `from` (exclusive) to `to` (inclusive). */
export function datesBetween(fromExclusive: LocalDate, toInclusive: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  let d = addDays(fromExclusive, 1);
  while (d <= toInclusive) {
    out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export function shieldCapFor(plusActive: boolean): number {
  return plusActive ? SHIELD_CAP_PLUS : SHIELD_CAP_FREE;
}
