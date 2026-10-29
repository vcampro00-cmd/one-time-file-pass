import { describe, expect, it } from "vitest";
import { LICENSE_PLANS, generateLicenseCode, licenseActive, licenseCodeSchema, licenseExpiry } from "./licenses";

describe("manual VCAMPRO licenses", () => {
  it("costs 15 euros for 7 days", () => {
    expect(LICENSE_PLANS.week.amount).toBe(1500);
    expect(licenseExpiry(null, LICENSE_PLANS.week.days, new Date("2026-10-29T12:00:00Z"))).toBe("2026-11-05T12:00:00.000Z");
  });
  it("costs 60 euros for 30 days", () => {
    expect(LICENSE_PLANS.month.amount).toBe(6000);
    expect(licenseExpiry(null, LICENSE_PLANS.month.days, new Date("2026-10-29T12:00:00Z"))).toBe("2026-11-28T12:00:00.000Z");
  });
  it("adds a manual renewal to the remaining validity", () => {
    expect(licenseExpiry("2026-11-05T12:00:00Z", 7, new Date("2026-10-29T12:00:00Z"))).toBe("2026-11-12T12:00:00.000Z");
  });
  it("renews an expired license from the time of payment", () => {
    expect(licenseExpiry("2026-10-20T12:00:00Z", 7, new Date("2026-10-29T12:00:00Z"))).toBe("2026-11-05T12:00:00.000Z");
  });
  it("rejects expired or revoked licenses", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(licenseActive({ expires_at: "2026-11-01T12:00:00Z", revoked: false }, now)).toBe(true);
    expect(licenseActive({ expires_at: now.toISOString(), revoked: false }, now)).toBe(false);
    expect(licenseActive({ expires_at: "2026-11-01T12:00:00Z", revoked: true }, now)).toBe(false);
  });
  it("uses separate high-entropy codes, never download codes", () => {
    expect(licenseCodeSchema.safeParse(generateLicenseCode()).success).toBe(true);
    expect(licenseCodeSchema.safeParse("1702-1417").success).toBe(false);
  });
});