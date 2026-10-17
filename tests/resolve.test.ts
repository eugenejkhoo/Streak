import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRestore,
  expireAtRisk,
  resolvePairDay,
  stageForGrowth,
  type DayInput,
  type PairState,
} from "../supabase/functions/_shared/resolve.ts";
import { addDays } from "../supabase/functions/_shared/localDay.ts";

const NOW = new Date("2026-10-18T10:00:00Z");

function fresh(over: Partial<PairState> = {}): PairState {
  return {
    streak: 0,
    streakAtRisk: 0,
    atRiskUntil: null,
    atRiskDate: null,
    shields: 0,
    shieldCap: 2,
    growth: 0,
    emptyDayRun: 0,
    hibernating: false,
    ...over,
  };
}

function day(date: string, a: boolean, b: boolean, bond = false, treats = false): DayInput {
  return { date, fedA: a, fedB: b, bothAnsweredBond: bond, treatExchanged: treats };
}

/** Run a sequence of (fedA, fedB) pairs from 2026-10-01. */
function run(seq: Array<[boolean, boolean]>, start = fresh()) {
  let s = start;
  let d = "2026-10-01";
  const days = [];
  for (const [a, b] of seq) {
    const r = resolvePairDay(s, day(d, a, b), NOW);
    s = r.state;
    days.push(r.day);
    d = addDays(d, 1);
  }
  return { state: s, days };
}

test("both fed grows and extends the streak", () => {
  const { state, days } = run([[true, true], [true, true]]);
  assert.equal(state.streak, 2);
  assert.equal(state.growth, 2);
  assert.equal(days[1].state, "both_fed");
  assert.equal(days[1].score, 65);
});

test("bond and treats add to the score, capped at 100", () => {
  const r = resolvePairDay(fresh(), day("2026-10-01", true, true, true, true), NOW);
  assert.equal(r.day.score, 100);
});

test("a shield is earned every 7 consecutive both-fed days, up to the cap", () => {
  const seven = Array.from({ length: 7 }, () => [true, true] as [boolean, boolean]);
  let { state, days } = run(seven);
  assert.equal(state.shields, 1);
  assert.equal(days[6].shieldEarned, true);
  ({ state } = run([...seven, ...seven, ...seven]));
  assert.equal(state.shields, 2, "capped at 2 on free");
  ({ state } = run([...seven, ...seven, ...seven], fresh({ shieldCap: 5 })));
  assert.equal(state.shields, 3, "plus cap allows more");
});

test("a miss with a shield consumes it and keeps the streak", () => {
  const seven = Array.from({ length: 7 }, () => [true, true] as [boolean, boolean]);
  const { state, days } = run([...seven, [true, false]]);
  assert.equal(days[7].state, "shielded");
  assert.equal(days[7].shieldConsumed, true);
  assert.equal(days[7].score, 30);
  assert.equal(state.streak, 7);
  assert.equal(state.shields, 0);
  assert.equal(state.growth, 7, "growth does not move on a shielded day");
});

test("a miss with no shield puts the streak at risk with a 48h window", () => {
  const { state, days } = run([[true, true], [true, true], [false, true]]);
  assert.equal(days[2].state, "at_risk");
  assert.equal(state.streak, 0);
  assert.equal(state.streakAtRisk, 2);
  assert.equal(state.atRiskDate, "2026-10-03");
  assert.equal(state.atRiskUntil?.toISOString(), "2026-10-20T10:00:00.000Z");
  assert.equal(state.growth, 2, "growth is never lost");
});

test("restore inside the window brings the streak back", () => {
  const { state, days } = run([[true, true], [true, true], [false, true]]);
  const r = applyRestore(state, days[2], false, false, new Date("2026-10-19T00:00:00Z"));
  assert.ok(r);
  assert.equal(r.day.state, "restored");
  assert.equal(r.state.streak, 2);
  assert.equal(r.state.atRiskUntil, null);
  assert.equal(r.day.score, 30);
});

test("restore after the window is refused and the day expires to a plain miss", () => {
  const { state, days } = run([[true, true], [false, true]]);
  const late = new Date("2026-10-21T00:00:00Z");
  assert.equal(applyRestore(state, days[1], false, false, late), null);
  const e = expireAtRisk(state, days[1], true, late);
  assert.ok(e);
  assert.equal(e.day.state, "missed_one");
  assert.equal(e.state.streak, 0);
  assert.equal(e.state.streakAtRisk, 0);
  assert.equal(e.state.growth, 1);
});

test("a miss with no streak to protect is recorded plainly, no at-risk", () => {
  const { days } = run([[false, true], [false, false]]);
  assert.equal(days[0].state, "missed_one");
  assert.equal(days[1].state, "missed_none");
});

test("growth never decreases across any sequence", () => {
  const seq: Array<[boolean, boolean]> = [
    [true, true], [true, true], [true, true], [false, false], [false, false],
    [true, false], [true, true], [false, false], [false, false], [false, false],
    [false, false], [false, false], [false, false], [false, false], [true, true],
  ];
  const { days } = run(seq);
  for (let i = 1; i < days.length; i++) {
    assert.ok(days[i].growthAfter >= days[i - 1].growthAfter);
  }
});

test("seven empty days hibernate the creature; one both-fed day wakes it", () => {
  const empty = Array.from({ length: 7 }, () => [false, false] as [boolean, boolean]);
  let r = run([[true, true], ...empty]);
  assert.equal(r.state.hibernating, true);
  assert.equal(r.days[7].hibernatingAfter, true);
  assert.equal(r.days[6].hibernatingAfter, false, "six empty days is not yet hibernation");
  r = run([[true, true], ...empty, [true, true]]);
  assert.equal(r.state.hibernating, false);
});

test("a one-sided day resets the empty run but does not wake a hibernating creature", () => {
  const empty = Array.from({ length: 7 }, () => [false, false] as [boolean, boolean]);
  const r = run([[true, true], ...empty, [true, false]]);
  assert.equal(r.state.emptyDayRun, 0);
  assert.equal(r.state.hibernating, true);
});

test("stages follow growth thresholds and hatch is flagged once", () => {
  assert.equal(stageForGrowth(0), "egg");
  assert.equal(stageForGrowth(3), "hatchling");
  assert.equal(stageForGrowth(14), "juvenile");
  assert.equal(stageForGrowth(45), "adolescent");
  assert.equal(stageForGrowth(100), "adult");
  const { days } = run([[true, true], [true, true], [true, true], [true, true]]);
  assert.equal(days[2].hatchReady, true);
  assert.equal(days[3].hatchReady, false);
});
