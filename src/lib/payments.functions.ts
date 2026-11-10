import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { canRevealCode, generateCode, hashCode, unusedExpiresAtFrom } from "./codes";

export const CODE_PRICE_ID = "access_code_10min_eur";
export const RESELLER_PRICE_ID = "access_code_reseller_eur";
export const IPHONE8_PRICE_ID = "access_code_iphone8_eur";

function checkEnv(env: unknown): StripeEnv {
  if (env !== "sandbox" && env !== "live") throw new Error("Environnement invalide");
  return env;
}

// Public: anyone can start buying a 10-minute code.
export const createCodeCheckout = createServerFn({ method: "POST" })
  .validator((d: { returnUrl: string; environment: StripeEnv; reseller?: boolean; iphone8?: boolean }) => ({
    returnUrl: String(d.returnUrl),
    environment: checkEnv(d.environment),
    reseller: d.reseller === true,
    iphone8: d.iphone8 === true,
  }))
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.reseller ? RESELLER_PRICE_ID : data.iphone8 ? IPHONE8_PRICE_ID : CODE_PRICE_ID] });
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
  .validator((d: { sessionId: string; environment: StripeEnv }) => {
    const sessionId = String(d.sessionId);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("Session invalide");
    return { sessionId, environment: checkEnv(d.environment) };
  })
  .handler(async ({ data }): Promise<{ code: string; expiresAt: string; reseller: boolean } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("code_purchases")
      .select("code, expires_at, reseller")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (existing) return { code: existing.code, expiresAt: existing.expires_at, reseller: existing.reseller };

    const stripe = createStripeClient(data.environment);
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(data.sessionId);
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
    if (session.payment_status === "unpaid") return { error: "Paiement non confirmé." };

    // Reseller purchase: the session was paid with the reseller price.
    let reseller = false;
    let iphone8 = false;
    try {
      const items = await stripe.checkout.sessions.listLineItems(data.sessionId, { limit: 5 });
      reseller = items.data.some((i) => {
        const p = i.price;
        return p?.lookup_key === RESELLER_PRICE_ID;
      });
      iphone8 = items.data.some((i) => i.price?.lookup_key === IPHONE8_PRICE_ID);
    } catch {
      reseller = false;
    }

    const { data: files } = await supabaseAdmin.from("files").select("id, owner_id").in("model", ["all", iphone8 ? "8" : "7"]);
    if (!files || files.length === 0) return { error: "Aucun fichier disponible pour le moment." };

    const firstFile = files[0];
    if (!firstFile) return { error: "Aucun fichier disponible pour le moment." };
    const code = generateCode();
    const expiresAt = unusedExpiresAtFrom(new Date()).toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("access_codes")
      .insert({ owner_id: firstFile.owner_id, code_hash: await hashCode(code), expires_at: expiresAt, reseller, model: iphone8 ? "8" : "7" })
      .select("id")
      .single();
    if (error) return { error: "Erreur lors de la création du code." };

    const { error: pe } = await supabaseAdmin.from("code_purchases").insert({
      session_id: data.sessionId,
      environment: data.environment,
      code,
      code_id: row.id,
      expires_at: expiresAt,
      reseller,
    });
    if (pe) {
      // Another request created it first: discard ours, return theirs.
      await supabaseAdmin.from("access_codes").delete().eq("id", row.id);
      const { data: again } = await supabaseAdmin
        .from("code_purchases").select("code, expires_at, reseller").eq("session_id", data.sessionId).single();
      return again ? { code: again.code, expiresAt: again.expires_at, reseller: again.reseller } : { error: "Erreur." };
    }
    await supabaseAdmin
      .from("access_code_files")
      .insert(files.map((f) => ({ code_id: row.id, file_id: f.id })));
    return { code, expiresAt, reseller };
  });

// Public: shows a purchased code again, only while it can still be redeemed.
export const revealPurchasedCode = createServerFn({ method: "POST" })
  .validator((d: { sessionId: string }) => {
    const sessionId = String(d.sessionId);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw new Error("Session invalide");
    return { sessionId };
  })
  .handler(async ({ data }): Promise<{ code: string; expiresAt: string } | { error: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: purchase } = await supabaseAdmin
      .from("code_purchases")
      .select("code, expires_at, code_id")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!purchase) return { error: "Aucun achat trouvé dans ce navigateur." };

    const { data: row } = await supabaseAdmin
      .from("access_codes")
      .select("used_at, expires_at")
      .eq("id", purchase.code_id)
      .maybeSingle();
    if (!row || !canRevealCode(row)) return { error: "Ce code n’est plus valide." };

    return { code: purchase.code, expiresAt: purchase.expires_at };
  });
