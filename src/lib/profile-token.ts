// Short-lived signed token that unlocks the profile download after a valid code was entered.
// Format: "<expiresAtMs>.<hex hmac-sha256>". Works in the Worker runtime (Web Crypto only).

export const PROFILE_TOKEN_TTL_MS = 10 * 60 * 1000;

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signProfileToken(secret: string, now = Date.now()): Promise<string> {
  const exp = now + PROFILE_TOKEN_TTL_MS;
  return `${exp}.${await hmac(secret, `dns-profile:${exp}`)}`;
}

export async function verifyProfileToken(secret: string, token: string, now = Date.now()): Promise<boolean> {
  const [expStr, sig, extra] = String(token ?? "").split(".");
  if (!expStr || !sig || extra !== undefined || !/^\d{1,15}$/.test(expStr)) return false;
  const exp = Number(expStr);
  if (exp <= now) return false;
  const expected = await hmac(secret, `dns-profile:${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export function profileUrl(token: string) {
  return `/api/public/dns-profile?t=${encodeURIComponent(token)}`;
}
