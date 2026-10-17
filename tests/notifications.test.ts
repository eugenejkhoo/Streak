import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFor, inQuietHours, shouldSend } from "../supabase/functions/_shared/notifications.ts";

const noQuiet = { start: null, end: null };
const night = { start: "22:00", end: "08:00" };

test("quiet hours across midnight", () => {
  assert.equal(inQuietHours("23:00", night), true);
  assert.equal(inQuietHours("07:59", night), true);
  assert.equal(inQuietHours("08:00", night), false);
  assert.equal(inQuietHours("12:00", night), false);
  assert.equal(inQuietHours("12:00", noQuiet), false);
});

test("N1 once per day", () => {
  assert.deepEqual(shouldSend({ code: "N1", localHHMM: "12:00", quiet: noQuiet, sentToday: [] }), { send: true });
  assert.deepEqual(shouldSend({ code: "N1", localHHMM: "12:00", quiet: noQuiet, sentToday: ["N1"] }), { send: false, reason: "already_sent" });
});

test("daily cap of two non-milestone pushes", () => {
  assert.deepEqual(shouldSend({ code: "N3", localHHMM: "12:00", quiet: noQuiet, sentToday: ["N1", "N2"] }), { send: false, reason: "daily_cap" });
  assert.deepEqual(shouldSend({ code: "N5", localHHMM: "12:00", quiet: noQuiet, sentToday: ["N1", "N2"] }), { send: true }, "milestones bypass the cap");
});

test("quiet hours block even milestones", () => {
  assert.deepEqual(shouldSend({ code: "N4", localHHMM: "02:00", quiet: night, sentToday: [] }), { send: false, reason: "quiet_hours" });
});

test("N6 merges into N1", () => {
  assert.deepEqual(shouldSend({ code: "N6", localHHMM: "12:00", quiet: noQuiet, sentToday: ["N1"] }), { send: false, reason: "already_sent" });
});

test("copy never says ignoring", () => {
  for (const c of ["N1", "N2", "N3", "N4", "N5", "N6", "N7"] as const) {
    const { title, body } = copyFor(c, "Maya");
    assert.doesNotMatch(title + body, /ignor/i);
  }
});
