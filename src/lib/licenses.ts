import { z } from "zod";

export const LICENSE_PLANS = {
  week: { label: "7 jours", days: 7, amount: 1500, priceId: "vcampro_license_week" },
  month: { label: "30 jours", days: 30, amount: 6000, priceId: "vcampro_license_30days" },
} as const;
export const licenseEnvSchema = z.enum(["sandbox", "live"]);
export const licenseCodeSchema = z.string().trim().toUpperCase().regex(/^VC-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/, "Code de licence invalide");
export function generateLicenseCode() {
  const hex = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return `VC-${hex.match(/.{8}/g)?.join("-")}`;
}
export function licenseExpiry(expiresAt: string | null, days: number, now = new Date()) {
  return new Date(Math.max(now.getTime(), expiresAt ? new Date(expiresAt).getTime() : 0) + days * 86400000).toISOString();
}
export function licenseActive(license: { expires_at: string; revoked: boolean }, now = new Date()) {
  return !license.revoked && new Date(license.expires_at).getTime() > now.getTime();
}
export function licenseHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — VCAMPRO INSTALLER` }, { name: "description", content: description },
    { property: "og:title", content: `${title} — VCAMPRO INSTALLER` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, follow" },
  ] };
}