// Shared reseller rules: passwords, sessions and one-time certification links.
export const RESELLER_LINK_TTL_HOURS = 24;
export const RESELLER_SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

export function randomHex(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function pbkdf2(password: string, saltHex: string, iterations: number): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const [kind, iter, salt, hash] = String(stored ?? "").split("$");
  if (kind !== "pbkdf2" || !iter || !salt || !hash) return false;
  const got = await pbkdf2(password, salt, Number(iter));
  if (got.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export const normalizeUsername = (u: string) => u.trim().toLowerCase();
export const isValidUsername = (u: string) => /^[a-z0-9._-]{3,32}$/.test(u);
export const MIN_PASSWORD_LENGTH = 6;

export const isHex32 = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{32}$/.test(s);

export function linkExpiry(now = Date.now()): Date {
  return new Date(now + RESELLER_LINK_TTL_HOURS * 3600_000);
}

export function sessionExpiry(now = Date.now()): Date {
  return new Date(now + RESELLER_SESSION_DAYS * 86400_000);
}

export function isLinkUsable(l: { expires_at: string; used_at: string | null } | null | undefined, now = Date.now()): boolean {
  return !!l && !l.used_at && new Date(l.expires_at).getTime() > now;
}
