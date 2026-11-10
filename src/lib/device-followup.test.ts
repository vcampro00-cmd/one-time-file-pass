import { describe, expect, it } from "vitest";
import { canDownloadFollowup, isFollowupFile } from "./device-followup";
import { signPurchaseCertification, verifyPurchaseCertification } from "./profile-token";

const device = { ready_at: "2026-11-10", installed_at: "2026-11-10", cancelled_at: null, ipa_path: "signed.ipa" };
describe("iPhone 8 post-install downloads", () => {
  it("unlocks iPhone 8 files after installation starts", () => expect(canDownloadFollowup(device, "8")).toBe(true));
  it("does not unlock before installation", () => expect(canDownloadFollowup({ ...device, installed_at: null }, "8")).toBe(false));
  it("does not unlock iPhone 7 purchases", () => expect(canDownloadFollowup(device, "7")).toBe(false));
  it("blocks cancelled devices", () => expect(canDownloadFollowup({ ...device, cancelled_at: "2026-11-11" }, "8")).toBe(false));
  it("includes iPhone 8 and shared apps but excludes iPhone 7", () => {
    expect(isFollowupFile("8")).toBe(true);
    expect(isFollowupFile("all")).toBe(true);
    expect(isFollowupFile("7")).toBe(false);
  });
  it("binds certification to a verified purchase and rejects tampering", async () => {
    const id = "bca1a238-f468-4a33-aa32-beb71384d328";
    const token = await signPurchaseCertification("test-secret", id, 1000);
    expect(await verifyPurchaseCertification("test-secret", token, 1001)).toBe(id);
    expect(await verifyPurchaseCertification("test-secret", token.replace(id, "aca1a238-f468-4a33-aa32-beb71384d328"), 1001)).toBe(null);
    expect(await verifyPurchaseCertification("test-secret", token, 1000 + 20 * 60 * 1000)).toBe(null);
  });
});