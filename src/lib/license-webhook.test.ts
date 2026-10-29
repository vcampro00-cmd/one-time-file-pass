import { afterEach, describe, expect, it } from "vitest";
import { verifyLicenseWebhook } from "./license-webhook.server";

afterEach(() => { delete process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"]; });
describe("license payment signature verification", () => {
  it("rejects forged payment callbacks", async () => {
    process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = "test-only-signing-secret";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const request = new Request("https://example.invalid", { method: "POST", body: "{}", headers: { "stripe-signature": `t=${timestamp},v1=${"0".repeat(64)}` } });
    await expect(verifyLicenseWebhook(request, "sandbox")).rejects.toThrow("Invalid signature");
  });
  it("accepts signed callbacks only with a fresh timestamp", async () => {
    const secret = "test-only-signing-secret";
    process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = secret;
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_example", status: "complete", payment_status: "paid", metadata: { kind: "vcampro_license" } } } });
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    async function request(age: number) {
      const timestamp = String(Math.floor(Date.now() / 1000) - age);
      const hash = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
      const sig = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
      return new Request("https://example.invalid", { method: "POST", body, headers: { "stripe-signature": `t=${timestamp},v1=${sig}` } });
    }
    expect((await verifyLicenseWebhook(await request(0), "sandbox")).data.object.payment_status).toBe("paid");
    await expect(verifyLicenseWebhook(await request(600), "sandbox")).rejects.toThrow("Invalid timestamp");
  });
});