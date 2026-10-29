import type Stripe from "stripe";
import { z } from "zod";

export async function verifyLicenseWebhook(request: Request, environment: "sandbox" | "live") {
  const secret = process.env[environment === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Webhook not configured");
  const signature = request.headers.get("stripe-signature") ?? "";
  const parts = signature.split(",").map(v => v.split("="));
  const timestamp = parts.find(v => v[0] === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Invalid timestamp");
  const body = await request.text();
  if (body.length > 1000000) throw new Error("Payload too large");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  let verified = false;
  for (const [name, value] of parts) {
    if (name !== "v1" || !value || !/^[a-f0-9]{64}$/.test(value)) continue;
    const bytes = Uint8Array.from(value.match(/.{2}/g) ?? [], v => parseInt(v, 16));
    if (await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${timestamp}.${body}`))) verified = true;
  }
  if (!verified) throw new Error("Invalid signature");
  const event = z.object({ type: z.string().max(150), data: z.object({ object: z.object({ id: z.string().max(255), metadata: z.record(z.string()).nullable().optional() }).passthrough() }) }).parse(JSON.parse(body));
  return event as { type: string; data: { object: Stripe.Checkout.Session } };
}