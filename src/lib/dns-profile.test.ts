import { describe, expect, it } from "vitest";
import { buildDnsProfile, PROFILE_NAME, PROFILE_SITE_URL } from "./dns-profile";
import { PROFILE_TOKEN_TTL_MS, signProfileToken, verifyProfileToken } from "./profile-token";

describe("DNS profile download token", () => {
  const secret = "test-secret-value";
  const now = 1_700_000_000_000;

  it("is valid for 10 minutes after a code was redeemed", async () => {
    expect(PROFILE_TOKEN_TTL_MS).toBe(10 * 60 * 1000);
    const t = await signProfileToken(secret, now);
    expect(await verifyProfileToken(secret, t, now + 9 * 60 * 1000)).toBe(true);
  });

  it("is rejected after 10 minutes", async () => {
    const t = await signProfileToken(secret, now);
    expect(await verifyProfileToken(secret, t, now + 10 * 60 * 1000 + 1)).toBe(false);
  });

  it("is rejected when forged or signed with another secret", async () => {
    const t = await signProfileToken(secret, now);
    expect(await verifyProfileToken("other-secret", t, now)).toBe(false);
    const [exp, sig] = t.split(".");
    expect(await verifyProfileToken(secret, `${Number(exp) + 600000}.${sig}`, now)).toBe(false);
    expect(await verifyProfileToken(secret, "", now)).toBe(false);
  });
});

describe("DNS profile content", () => {
  const xml = buildDnsProfile();

  it("is named VCAMPRO INSTALLER and opens the owner's site from the home screen", () => {
    expect(PROFILE_NAME).toBe("VCAMPRO INSTALLER");
    expect(xml).toContain("<key>PayloadDisplayName</key>\n\t<string>VCAMPRO INSTALLER</string>");
    expect(xml).toContain(`<key>URL</key>\n\t\t\t<string>${PROFILE_SITE_URL}</string>`);
    expect(PROFILE_SITE_URL).toBe("https://vcamproinstaller.com");
  });

  it("carries no trace of the original author's shortcut", () => {
    expect(xml).not.toContain("Bio Khoindvn");
    expect(xml).not.toContain("api.khoindvn.eu.org");
  });
});
