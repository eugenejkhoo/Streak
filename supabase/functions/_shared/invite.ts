/**
 * Pair invites. Pure logic; the edge functions do the I/O.
 * docs/03-spec-v1.md section 6.1: links expire after 7 days, one active pair per user.
 */

export const INVITE_TTL_DAYS = 7;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/1/l/i

/** 12-char token from a source of random bytes. */
export function inviteToken(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function inviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 86_400_000);
}

export type PairStatus = "pending" | "active" | "solo" | "ended";

export interface JoinCheck {
  pairStatus: PairStatus;
  createdBy: string;
  inviteExpiresAt: Date | null;
  activeMemberCount: number;
  joiningUserId: string;
  joiningUserHasActivePair: boolean;
  now: Date;
}

export type JoinVerdict =
  | { ok: true }
  | { ok: false; reason: "expired" | "self" | "full" | "ended" | "already_paired" };

export function canJoin(c: JoinCheck): JoinVerdict {
  if (c.pairStatus === "ended") return { ok: false, reason: "ended" };
  if (c.createdBy === c.joiningUserId) return { ok: false, reason: "self" };
  if (c.joiningUserHasActivePair) return { ok: false, reason: "already_paired" };
  if (c.activeMemberCount >= 2 || c.pairStatus === "active") return { ok: false, reason: "full" };
  if (!c.inviteExpiresAt || c.now.getTime() > c.inviteExpiresAt.getTime()) return { ok: false, reason: "expired" };
  return { ok: true };
}
