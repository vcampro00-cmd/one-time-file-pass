// Shared rules for one-time download passwords.
export const CODE_TTL_MINUTES = 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const CODE_LENGTH = 8;

// Owner's master code: permanent, never consumed.
export const MASTER_CODE = "17021417";

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isMasterCode(input: string): boolean {
  return normalizeCode(input) === MASTER_CODE;
}

export function isCodeComplete(input: string): boolean {
  const n = normalizeCode(input).length;
  return n === CODE_LENGTH || n === MASTER_CODE.length;
}

export function formatCode(code: string): string {
  const c = normalizeCode(code);
  if (c.length === CODE_LENGTH) return `${c.slice(0, 4)}-${c.slice(4)}`;
  return c;
}

// Live typing mask: the dash in the middle appears by itself.
export function maskCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const chars = cleaned.replace(/-/g, "").slice(0, CODE_LENGTH);
  const dash = cleaned.indexOf("-");
  if (dash > 0) {
    const pos = Math.min(cleaned.slice(0, dash).replace(/[^A-Z0-9]/g, "").length, chars.length);
    if (pos > 0) return `${chars.slice(0, pos)}-${chars.slice(pos)}`;
  }
  return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars;
}

export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeCode(code));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function expiresAtFrom(now: Date): Date {
  return new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
}

export function codeStatus(
  c: { expires_at: string; used_at: string | null },
  now = new Date(),
): "usada" | "expirada" | "ativa" {
  if (c.used_at) return "usada";
  if (new Date(c.expires_at) <= now) return "expirada";
  return "ativa";
}

// A purchased code may be shown again only while it can still be redeemed.
export function canRevealCode(c: { expires_at: string; used_at: string | null }, now = new Date()): boolean {
  return codeStatus(c, now) === "ativa";
}
