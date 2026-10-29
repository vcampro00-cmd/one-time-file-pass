import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LICENSE_PLANS, generateLicenseCode, licenseActive, licenseCodeSchema, licenseEnvSchema, licenseExpiry } from "./licenses";
import { createStripeClient, getStripeErrorMessage } from "./stripe.server";

export const lookupLicense = createServerFn({ method: "POST" })
  .validator((input: { code: string; environment: "sandbox" | "live" }) => z.object({ code: licenseCodeSchema, environment: licenseEnvSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("vcampro_licenses").select("expires_at, revoked").eq("code", data.code).eq("environment", data.environment).maybeSingle();
    if (error) throw new Error("Vérification indisponible.");
    return row ? { found: true, active: licenseActive(row), expiresAt: row.expires_at, revoked: row.revoked } : { found: false, active: false, expiresAt: null, revoked: false };
  });

export const createLicenseCheckout = createServerFn({ method: "POST" })
  .validator((input: { plan: "week" | "month"; environment: "sandbox" | "live"; code?: string; origin: string }) => z.object({
    plan: z.enum(["week", "month"]), environment: licenseEnvSchema, code: licenseCodeSchema.optional(),
    origin: z.string().url().max(300).refine(v => ["https://vcamproinstaller.com", "https://www.vcamproinstaller.com", "https://one-time-file-pass.lovable.app", "http://localhost:8080", "https://id-preview--57e81844-5c88-46cd-99a3-b9ade9b2c438.lovable.app"].includes(v), "Adresse invalide"),
  }).parse(input))
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      let licenseId: string | undefined;
      if (data.code) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin.from("vcampro_licenses").select("id, revoked").eq("code", data.code).eq("environment", data.environment).maybeSingle();
        if (!row || row.revoked) return { error: "Licence introuvable ou suspendue." };
        licenseId = row.id;
      }
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [LICENSE_PLANS[data.plan].priceId] });
      const price = prices.data[0];
      if (!price || price.unit_amount !== LICENSE_PLANS[data.plan].amount) throw new Error("Prix indisponible.");
      const product = await stripe.products.retrieve(typeof price.product === "string" ? price.product : price.product.id);
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }], mode: "payment", ui_mode: "embedded_page", locale: "fr",
        return_url: `${data.origin}/licences/retour?session_id={CHECKOUT_SESSION_ID}`,
        managed_payments: { enabled: true }, payment_intent_data: { description: product.name },
        metadata: { kind: "vcampro_license", plan: data.plan, ...(licenseId ? { license_id: licenseId } : {}) },
      });
      if (!session.client_secret) throw new Error("Paiement indisponible.");
      return { clientSecret: session.client_secret };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

export const claimLicensePayment = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string; environment: "sandbox" | "live" }) => z.object({ sessionId: z.string().max(255).regex(/^cs_[A-Za-z0-9_]+$/), environment: licenseEnvSchema }).parse(input))
  .handler(async ({ data }): Promise<{ code: string; expiresAt: string; revoked: boolean } | { error: string }> => {
    try {
      const session = await createStripeClient(data.environment).checkout.sessions.retrieve(data.sessionId);
      const { fulfillLicense } = await import("./licenses.server");
      return await fulfillLicense(session, data.environment);
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

export const listManagedLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: operator } = await context.supabase.from("license_operators").select("user_id").eq("user_id", context.userId).maybeSingle();
    if (!operator) throw new Error("Accès réservé au propriétaire.");
    const { data: licenses, error } = await context.supabase.from("vcampro_licenses").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error("Chargement indisponible.");
    const { data: payments, error: pe } = await context.supabase.from("vcampro_license_payments").select("*").order("created_at", { ascending: false }).limit(500);
    if (pe) throw new Error("Chargement des paiements indisponible.");
    return { licenses: licenses ?? [], payments: payments ?? [] };
  });

export const issueManagedLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { plan: "week" | "month"; environment: "sandbox" | "live"; label: string }) => z.object({ plan: z.enum(["week", "month"]), environment: licenseEnvSchema, label: z.string().trim().max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: operator } = await context.supabase.from("license_operators").select("user_id").eq("user_id", context.userId).maybeSingle();
    if (!operator) throw new Error("Accès réservé au propriétaire.");
    const { data: row, error } = await context.supabase.from("vcampro_licenses").insert({ owner_id: context.userId, code: generateLicenseCode(), customer_label: data.label, environment: data.environment, expires_at: licenseExpiry(null, LICENSE_PLANS[data.plan].days) }).select("code, expires_at").single();
    if (error) throw new Error("Création impossible.");
    return row;
  });

export const setLicenseRevoked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; revoked: boolean }) => z.object({ id: z.string().uuid(), revoked: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase.from("vcampro_licenses").update({ revoked: data.revoked }).eq("id", data.id).eq("owner_id", context.userId).select("id").single();
    if (error || !row) throw new Error("Modification impossible.");
    return { ok: true };
  });