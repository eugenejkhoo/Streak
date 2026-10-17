import { test } from "node:test";
import assert from "node:assert/strict";
import { canJoin, inviteExpiry, inviteToken } from "../supabase/functions/_shared/invite.ts";

const now = new Date("2026-10-17T12:00:00Z");
const base = {
  pairStatus: "pending" as const,
  createdBy: "A",
  inviteExpiresAt: inviteExpiry(now),
  activeMemberCount: 1,
  joiningUserId: "B",
  joiningUserHasActivePair: false,
  now,
};

test("token is 12 chars from the unambiguous alphabet", () => {
  const t = inviteToken((n) => new Uint8Array(n).map((_, i) => i * 37));
  assert.equal(t.length, 12);
  assert.doesNotMatch(t, /[01oil]/);
});

test("invite expires after 7 days", () => {
  assert.equal(inviteExpiry(now).toISOString(), "2026-10-24T12:00:00.000Z");
});

test("happy path", () => assert.deepEqual(canJoin(base), { ok: true }));
test("creator cannot join their own pair", () => assert.deepEqual(canJoin({ ...base, joiningUserId: "A" }), { ok: false, reason: "self" }));
test("expired link", () => assert.deepEqual(canJoin({ ...base, now: new Date("2026-10-25T00:00:00Z") }), { ok: false, reason: "expired" }));
test("full pair", () => assert.deepEqual(canJoin({ ...base, activeMemberCount: 2, pairStatus: "active" }), { ok: false, reason: "full" }));
test("joiner already in a pair", () => assert.deepEqual(canJoin({ ...base, joiningUserHasActivePair: true }), { ok: false, reason: "already_paired" }));
test("ended pair", () => assert.deepEqual(canJoin({ ...base, pairStatus: "ended" }), { ok: false, reason: "ended" }));
