import { test } from "node:test";
import assert from "node:assert/strict";
import { assignTemplate, progress, TEMPLATES, weekDates, weekStart } from "../supabase/functions/_shared/expeditions.ts";

test("weekStart is Monday", () => {
  assert.equal(weekStart("2026-10-17"), "2026-10-12"); // Saturday -> Monday
  assert.equal(weekStart("2026-10-12"), "2026-10-12");
  assert.equal(weekStart("2026-10-18"), "2026-10-12"); // Sunday belongs to the week before
  assert.equal(weekStart("2026-10-19"), "2026-10-19");
  assert.equal(weekDates("2026-10-12").at(-1), "2026-10-18");
});

test("templates rotate weekly per pair", () => {
  const a = assignTemplate("2026-10-12", 0), b = assignTemplate("2026-10-19", 0);
  assert.notEqual(a.id, b.id);
  assert.equal(assignTemplate("2026-10-12", 1).id, TEMPLATES[(TEMPLATES.indexOf(a) + 1) % TEMPLATES.length].id);
});

const start = "2026-10-12";
const d = weekDates(start);
const none = new Set<string>();

test("both_fed_days counts both-fed days only", () => {
  const t = TEMPLATES.find((x) => x.id === "feed5")!;
  const p = progress(t, start, { dayStates: { [d[0]]: "both_fed", [d[1]]: "both_fed", [d[2]]: "shielded", [d[3]]: "both_fed" }, answeredA: none, answeredB: none, photoA: none, photoB: none });
  assert.deepEqual([p.pair, p.completed], [3, false]);
  const full = progress(t, start, { dayStates: Object.fromEntries(d.slice(0, 5).map((x) => [x, "both_fed"])), answeredA: none, answeredB: none, photoA: none, photoB: none });
  assert.equal(full.completed, true);
});

test("both_answered_days needs both on the same day", () => {
  const t = TEMPLATES.find((x) => x.id === "answer4")!;
  const p = progress(t, start, { dayStates: {}, answeredA: new Set(d.slice(0, 5)), answeredB: new Set(d.slice(2, 7)), photoA: none, photoB: none });
  assert.deepEqual([p.a, p.b, p.pair], [4, 4, 3]);
});

test("same_day_photo", () => {
  const t = TEMPLATES.find((x) => x.id === "photo_same_day")!;
  const p = progress(t, start, { dayStates: {}, answeredA: none, answeredB: none, photoA: new Set([d[1], d[4]]), photoB: new Set([d[4]]) });
  assert.deepEqual([p.pair, p.completed], [1, true]);
});

test("both_fed_run is the best consecutive run", () => {
  const t = TEMPLATES.find((x) => x.id === "run3")!;
  const p = progress(t, start, { dayStates: { [d[0]]: "both_fed", [d[1]]: "both_fed", [d[2]]: "missed_one", [d[3]]: "both_fed", [d[4]]: "both_fed", [d[5]]: "both_fed" }, answeredA: none, answeredB: none, photoA: none, photoB: none });
  assert.deepEqual([p.pair, p.completed], [3, true]);
});
