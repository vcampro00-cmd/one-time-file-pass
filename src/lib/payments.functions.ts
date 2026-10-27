import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { expiresAtFrom, generateCode, hashCode } from "./codes";

export const CODE_PRICE_ID = "access_code_10min_eur";

function checkEnv(env: unknown): StripeEnv {
  if (env !== "sandbox" && env !== "live") throw new Error("Environnement invalide");
  return env;
}

// Public: anyone can start buying a 10-minute code.
export const createCodeCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: { returnUrl: string; environment: StripeEnv }) => ({
    returnUrl: String(d.returnUrl),
    environment: checkEnv(d.environment),
  }))
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [CODE_PRICE_ID] });
      const price = prices.data[0];
      if (!price) throw new Error("Prix introuvable");
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        locale: "fr",
        return_url: data.returnUrl,
        payment_intent_data: { description: product.name },
        managed_payments: { enabled: true },
        metadata: { managed_payments: "true", kind: "access_code" },
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

// Public: after payment, returns the code for a paid session (created once, same code on reload).
export const claimPurchasedCode = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; environment: StripeEnv }) => {
    const sessionId = String(d.sessionId);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("Session invalide");
    return { sessionId, environment: checkEnv(d.environment) };
  })
  .handler(async ({ data }): Promise<{ code: string; expiresAt: string } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("code_purchases")
      .select("code, expires_at")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (existing) return { code: existing.code, expiresAt: existing.expires_at };

    let session: Stripe.Checkout.Session;
    try {
      session = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
    if (session.payment_status === "unpaid") return { error: "Paiement non confirmé." };

    const { data: files } = await supabaseAdmin.from("files").select("id, owner_id");
    if (!files || files.length === 0) return { error: "Aucun fichier disponible pour le moment." };

    const code = generateCode();
    const expiresAt = expiresAtFrom(new Date()).toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("access_codes")
      .insert({ owner_id: files[0].owner_id, code_hash: await hashCode(code), expires_at: expiresAt })
      .select("id")
      .single();
    if (error) return { error: "Erreur lors de la création du code." };

    const { error: pe } = await supabaseAdmin.from("code_purchases").insert({
      session_id: data.sessionId,
      environment: data.environment,
      code,
      code_id: row.id,
      expires_at: expiresAt,
    });
    if (pe) {
      // Another request created it first: discard ours, return theirs.
      await supabaseAdmin.from("access_codes").delete().eq("id", row.id);
      const { data: again } = await supabaseAdmin
        .from("code_purchases").select("code, expires_at").eq("session_id", data.sessionId).single();
      return again ? { code: again.code, expiresAt: again.expires_at } : { error: "Erreur." };
    }
    await supabaseAdmin
      .from("access_code_files")
      .insert(files.map((f) => ({ code_id: row.id, file_id: f.id })));
    return { code, expiresAt };
  });
