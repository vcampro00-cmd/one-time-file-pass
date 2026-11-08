import { describe, expect, it } from "vitest";
import { isLinkUsable, linkExpiry } from "./resellers";

describe("reseller links", () => {
  const now = Date.parse("2026-11-08T00:00:00Z");
  it("expire 24 hours after creation", () => {
    expect(linkExpiry(now).toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });
  it("can be used only once", () => {
    expect(isLinkUsable({ expires_at: "2026-11-09T00:00:00Z", used_at: null }, now)).toBe(true);
    expect(isLinkUsable({ expires_at: "2026-11-09T00:00:00Z", used_at: "2026-11-08T00:00:00Z" }, now)).toBe(false);
  });
  it("cannot be used after expiry", () => {
    expect(isLinkUsable({ expires_at: "2026-11-07T23:59:59Z", used_at: null }, now)).toBe(false);
  });
});

import { hashPassword, verifyPassword } from "./resellers";
describe("reseller passwords", () => {
  it("accept the right password and reject a wrong one", async () => {
    const h = await hashPassword("segredo1");
    expect(await verifyPassword("segredo1", h)).toBe(true);
    expect(await verifyPassword("segredo2", h)).toBe(false);
  });
});
