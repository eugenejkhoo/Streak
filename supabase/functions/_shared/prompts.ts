/**
 * Deterministic daily prompt selection. docs/04 reveal rule: packs rotate
 * daily in listed order; within a pack prompts go round-robin. A per-pair
 * offset spreads pairs across the bank so two pairs rarely see the same
 * prompt on the same day. Mirrored in SQL by pair_view() (migration 0002);
 * the pg validation script asserts both agree.
 */

import { parseLocalDate, type LocalDate } from "./localDay.ts";

export const CREW_PACKS = ["plan", "reflect", "honest", "hype", "crewmate", "wildcard"] as const;
export const COUPLE_PACKS = ["appreciate", "remember", "ahead", "play", "knowme", "today"] as const;
export const PACK_SIZE = 20;

export function packsFor(mode: "crew" | "couple"): readonly string[] {
  return mode === "crew" ? CREW_PACKS : COUPLE_PACKS;
}

/** Days since 1970-01-01 for a local date string. */
export function dayIndex(d: LocalDate): number {
  const { y, m, d: dd } = parseLocalDate(d);
  return Math.floor(Date.UTC(y, m - 1, dd) / 86_400_000);
}

/**
 * Stable small integer from the pair id. Deliberately simple so SQL can
 * mirror it exactly: see pair_offset() in migration 0002.
 */
export function pairOffset(pairId: string): number {
  let h = 0;
  for (const ch of pairId) h = (h * 31 + ch.charCodeAt(0)) % 4294967296;
  return h & 1023;
}

export interface PromptPick {
  pack: string;
  /** 0-based position within the pack */
  sort: number;
}

export function pickPrompt(mode: "crew" | "couple", date: LocalDate, offset: number): PromptPick {
  const packs = packsFor(mode);
  const di = dayIndex(date) + offset;
  const pack = packs[((di % packs.length) + packs.length) % packs.length];
  const sort = Math.floor(di / packs.length) % PACK_SIZE;
  return { pack, sort: ((sort % PACK_SIZE) + PACK_SIZE) % PACK_SIZE };
}
