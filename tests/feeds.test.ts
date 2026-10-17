import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFeed, healthMeetsTarget, type FeedRequest } from "../supabase/functions/_shared/feeds.ts";

const now = new Date("2026-10-18T00:30:00Z"); // 01:30 London -> local date 2026-10-17
const manualHabit = { id: "h1", userId: "A", kind: "manual" as const, targetValue: null };
const stepsHabit = { id: "h2", userId: "A", kind: "health_steps" as const, targetValue: 8000 };
const photoHabit = { id: "h3", userId: "A", kind: "photo" as const, targetValue: null };

function req(over: Partial<FeedRequest>): FeedRequest {
  return {
    pairId: "p",
    userId: "A",
    habit: manualHabit,
    source: "manual",
    reportedTz: "Europe/London",
    storedTz: "Europe/London",
    storedTzUpdatedAt: null,
    now,
    existingLocalDates: new Set(),
    ...over,
  };
}

test("health thresholds", () => {
  assert.equal(healthMeetsTarget("health_workout", 1, null), true);
  assert.equal(healthMeetsTarget("health_workout", 0, null), false);
  assert.equal(healthMeetsTarget("health_steps", 7999, 8000), false);
  assert.equal(healthMeetsTarget("health_steps", 8000, 8000), true);
  assert.equal(healthMeetsTarget("health_sleep", 7.5, 7), true);
  assert.equal(healthMeetsTarget("health_mindful", 5, 10), false);
  assert.equal(healthMeetsTarget("manual", 100, null), false);
});

test("manual feed stamps the 03:00-boundary local date", () => {
  const v = buildFeed(req({}));
  assert.ok(v.ok);
  assert.equal(v.row.local_date, "2026-10-17");
  assert.equal(v.row.source, "manual");
});

test("duplicate for the same local date is refused", () => {
  const v = buildFeed(req({ existingLocalDates: new Set(["2026-10-17"]) }));
  assert.deepEqual(v, { ok: false, reason: "duplicate" });
});

test("photo habit requires a photo", () => {
  assert.deepEqual(buildFeed(req({ habit: photoHabit, source: "photo" })), { ok: false, reason: "photo_required" });
  assert.ok(buildFeed(req({ habit: photoHabit, source: "photo", photoUrl: "u" })).ok);
});

test("health feed must meet the target; override is allowed and marked", () => {
  assert.deepEqual(buildFeed(req({ habit: stepsHabit, source: "health", healthValue: 5000 })), { ok: false, reason: "health_below_target" });
  const ok = buildFeed(req({ habit: stepsHabit, source: "health", healthValue: 9000 }));
  assert.ok(ok.ok && ok.row.health_value === 9000);
  const ov = buildFeed(req({ habit: stepsHabit, source: "override" }));
  assert.ok(ov.ok && ov.row.source === "override");
});

test("source must match the habit kind", () => {
  assert.deepEqual(buildFeed(req({ habit: stepsHabit, source: "manual" })), { ok: false, reason: "bad_source" });
  assert.deepEqual(buildFeed(req({ habit: manualHabit, source: "health", healthValue: 1 })), { ok: false, reason: "bad_source" });
});

test("cannot feed someone else's habit", () => {
  assert.deepEqual(buildFeed(req({ habit: { ...manualHabit, userId: "B" } })), { ok: false, reason: "not_your_habit" });
});

test("a tz change within 24h is ignored for stamping; after 24h it is trusted", () => {
  // Reported Tokyo would make it 09:30 on the 18th.
  const ignored = buildFeed(req({ reportedTz: "Asia/Tokyo", storedTzUpdatedAt: new Date("2026-10-17T20:00:00Z") }));
  assert.ok(ignored.ok && ignored.row.local_date === "2026-10-17" && ignored.row.tz_changed === false);
  const trusted = buildFeed(req({ reportedTz: "Asia/Tokyo", storedTzUpdatedAt: new Date("2026-10-10T00:00:00Z") }));
  assert.ok(trusted.ok && trusted.row.local_date === "2026-10-18" && trusted.row.tz_changed === true && trusted.row.device_tz === "Asia/Tokyo");
});

test("note length is capped", () => {
  assert.deepEqual(buildFeed(req({ note: "x".repeat(281) })), { ok: false, reason: "note_too_long" });
});
