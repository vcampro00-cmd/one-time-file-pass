// Shared reseller rules: access keys and one-time certification links.
export const RESELLER_LINK_TTL_HOURS = 24;

export function randomHex(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const isHex32 = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{32}$/.test(s);

export function linkExpiry(now = Date.now()): Date {
  return new Date(now + RESELLER_LINK_TTL_HOURS * 3600_000);
}

export function isLinkUsable(l: { expires_at: string; used_at: string | null } | null | undefined, now = Date.now()): boolean {
  return !!l && !l.used_at && new Date(l.expires_at).getTime() > now;
}
