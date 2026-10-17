import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  localDateOf,
  localDayCloses,
  localDayOpens,
  pairDayIsClosed,
  pairDayWindow,
  trustedTimeZone,
} from "../supabase/functions/_shared/localDay.ts";

const LON = "Europe/London";
const LA = "America/Los_Angeles";
const TYO = "Asia/Tokyo";
const NYC = "America/New_York";

test("03:00 boundary: 01:30 counts for the previous day", () => {
  // 2026-10-18 01:30 London (BST, UTC+1) = 00:30Z
  assert.equal(localDateOf(new Date("2026-10-18T00:30:00Z"), LON), "2026-10-17");
  // 2026-10-18 03:00 London exactly = 02:00Z -> new day
  assert.equal(localDateOf(new Date("2026-10-18T02:00:00Z"), LON), "2026-10-18");
  // 02:59:59 -> still previous day
  assert.equal(localDateOf(new Date("2026-10-18T01:59:59Z"), LON), "2026-10-17");
});

test("same instant, different local dates across the date line", () => {
  const t = new Date("2026-10-17T20:00:00Z"); // 05:00 Tokyo on the 18th, 16:00 NYC on the 17th
  assert.equal(localDateOf(t, TYO), "2026-10-18");
  assert.equal(localDateOf(t, NYC), "2026-10-17");
});

test("local day opens and closes at 03:00 local", () => {
  // Los Angeles PDT is UTC-7 in mid October.
  assert.equal(localDayOpens("2026-10-17", LA).toISOString(), "2026-10-17T10:00:00.000Z");
  assert.equal(localDayCloses("2026-10-17", LA).toISOString(), "2026-10-18T10:00:00.000Z");
});

test("pair window spans earliest open to latest close: London + LA is 32 hours", () => {
  const w = pairDayWindow("2026-10-17", [LON, LA]);
  assert.equal(w.opens.toISOString(), "2026-10-17T02:00:00.000Z"); // 03:00 BST
  assert.equal(w.closes.toISOString(), "2026-10-18T10:00:00.000Z"); // 03:00 PDT next day
  assert.equal((w.closes.getTime() - w.opens.getTime()) / 3_600_000, 32);
});

test("pair day is closed only once the later member's day has ended", () => {
  const tzs = [LON, LA];
  assert.equal(pairDayIsClosed("2026-10-17", tzs, new Date("2026-10-18T05:00:00Z")), false); // London is done, LA is not
  assert.equal(pairDayIsClosed("2026-10-17", tzs, new Date("2026-10-18T10:00:00Z")), true);
});

test("DST: London falls back on 2026-10-25, boundary still lands on 03:00 wall time", () => {
  // After fall-back London is UTC+0, so 03:00 local on the 26th is 03:00Z.
  assert.equal(localDayOpens("2026-10-26", LON).toISOString(), "2026-10-26T03:00:00.000Z");
  // Before it, 03:00 BST on the 24th is 02:00Z.
  assert.equal(localDayOpens("2026-10-24", LON).toISOString(), "2026-10-24T02:00:00.000Z");
});

test("addDays crosses month and year ends", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-03-01", -1), "2027-02-28");
});

test("time zone changes are accepted at most once per 24h", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  assert.deepEqual(
    trustedTimeZone({ storedTz: LON, storedTzUpdatedAt: null, reportedTz: TYO, now }),
    { tz: TYO, accepted: true },
  );
  assert.deepEqual(
    trustedTimeZone({ storedTz: LON, storedTzUpdatedAt: new Date("2026-10-17T00:00:00Z"), reportedTz: TYO, now }),
    { tz: LON, accepted: false },
  );
  assert.deepEqual(
    trustedTimeZone({ storedTz: LON, storedTzUpdatedAt: new Date("2026-10-16T11:00:00Z"), reportedTz: TYO, now }),
    { tz: TYO, accepted: true },
  );
});
