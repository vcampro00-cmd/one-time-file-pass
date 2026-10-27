// Shared rules for one-time download passwords.
export const CODE_TTL_MINUTES = 10;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const CODE_LENGTH = 8;

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
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
