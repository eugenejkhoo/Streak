/**
 * Minimal APNs sender for Deno: ES256 JWT via WebCrypto, HTTP/2 via fetch.
 * Env: APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY (PKCS8 PEM), APNS_BUNDLE_ID, APNS_SANDBOX ("1" for dev).
 */

let cached: { token: string; at: number } | null = null;

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

/** APNs wants raw r||s signatures, which is what WebCrypto ECDSA produces. */
export async function providerToken(teamId: string, keyId: string, pem: string, now = Date.now()): Promise<string> {
  if (cached && now - cached.at < 50 * 60_000) return cached.token;
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }));
  const key = await importKey(pem);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${claims}`));
  const token = `${header}.${claims}.${b64url(sig)}`;
  cached = { token, at: now };
  return token;
}

export interface Push {
  deviceToken: string;
  title: string;
  body: string;
  /** "alert" or "background" */
  type?: "alert" | "background";
  data?: Record<string, unknown>;
  collapseId?: string;
}

export async function sendPush(p: Push): Promise<{ ok: boolean; status: number; reason?: string }> {
  const host = Deno.env.get("APNS_SANDBOX") === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
  const token = await providerToken(Deno.env.get("APNS_TEAM_ID")!, Deno.env.get("APNS_KEY_ID")!, Deno.env.get("APNS_PRIVATE_KEY")!);
  const background = p.type === "background";
  const payload = background
    ? { aps: { "content-available": 1 }, ...p.data }
    : { aps: { alert: { title: p.title, body: p.body }, sound: "default" }, ...p.data };
  const headers: Record<string, string> = {
    authorization: `bearer ${token}`,
    "apns-topic": Deno.env.get("APNS_BUNDLE_ID")!,
    "apns-push-type": background ? "background" : "alert",
    "apns-priority": background ? "5" : "10",
  };
  if (p.collapseId) headers["apns-collapse-id"] = p.collapseId;
  const res = await fetch(`${host}/3/device/${p.deviceToken}`, { method: "POST", headers, body: JSON.stringify(payload) });
  if (res.ok) return { ok: true, status: res.status };
  const reason = (await res.json().catch(() => ({})))?.reason;
  return { ok: false, status: res.status, reason };
}
