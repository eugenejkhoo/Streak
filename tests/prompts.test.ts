import { test } from "node:test";
import assert from "node:assert/strict";
import { COUPLE_PACKS, CREW_PACKS, dayIndex, pairOffset, pickPrompt } from "../supabase/functions/_shared/prompts.ts";
import { addDays } from "../supabase/functions/_shared/localDay.ts";

test("dayIndex is days since epoch", () => {
  assert.equal(dayIndex("1970-01-01"), 0);
  assert.equal(dayIndex("1970-01-02"), 1);
  assert.equal(dayIndex("2026-10-17"), 20743);
});

test("pairOffset is stable and bounded", () => {
  const o = pairOffset("33333333-3333-3333-3333-333333333333");
  assert.equal(o, pairOffset("33333333-3333-3333-3333-333333333333"));
  assert.ok(o >= 0 && o < 1024);
  assert.notEqual(o, pairOffset("44444444-4444-4444-4444-444444444444"));
});

test("packs rotate daily and prompts advance once per full rotation", () => {
  let d = "2026-10-05";
  const seen = [];
  for (let i = 0; i < 12; i++) { seen.push(pickPrompt("crew", d, 0)); d = addDays(d, 1); }
  assert.deepEqual(seen.slice(0, 6).map((p) => p.pack), [...CREW_PACKS].slice(dayIndex("2026-10-05") % 6).concat([...CREW_PACKS].slice(0, dayIndex("2026-10-05") % 6)));
  // Same pack six days apart, next sort.
  assert.equal(seen[6].pack, seen[0].pack);
  assert.equal(seen[6].sort, (seen[0].sort + 1) % 20);
});

test("a pair sees all 120 prompts over 120 days with no repeats", () => {
  for (const mode of ["crew", "couple"] as const) {
    const keys = new Set<string>();
    let d = "2026-01-01";
    for (let i = 0; i < 120; i++) { const p = pickPrompt(mode, d, 517); keys.add(`${p.pack}/${p.sort}`); d = addDays(d, 1); }
    assert.equal(keys.size, 120);
    const packs = mode === "crew" ? CREW_PACKS : COUPLE_PACKS;
    for (const k of keys) assert.ok(packs.includes(k.split("/")[0] as never));
  }
});

test("offset shifts which prompt a pair sees", () => {
  assert.notDeepEqual(pickPrompt("couple", "2026-10-17", 0), pickPrompt("couple", "2026-10-17", 1));
});
