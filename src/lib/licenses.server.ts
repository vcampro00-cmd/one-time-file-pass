import type Stripe from "stripe";
import { createStripeClient, type StripeEnv } from "./stripe.server";
import { generateLicenseCode, LICENSE_PLANS } from "./licenses";

// Shared by the paid return and verified webhook, not by RPC-to-RPC calls.
export async function fulfillLicense(session: Stripe.Checkout.Session, environment: StripeEnv) {
  if (session.metadata?.["kind"] !== "vcampro_license" || session.status !== "complete" || session.payment_status !== "paid")
    throw new Error("Paiement non confirmé.");
  const plan = session.metadata["plan"];
  if (plan !== "week" && plan !== "month") throw new Error("Plan invalide.");
  const stripe = createStripeClient(environment);
  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
  const item = items.data[0];
  const lookup = item?.price?.lookup_key;
  if (items.data.length !== 1 || item?.quantity !== 1 || lookup !== LICENSE_PLANS[plan].priceId || item.price?.unit_amount !== LICENSE_PLANS[plan].amount || item.price?.currency !== "eur")
    throw new Error("Paiement incompatible avec cette licence.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("fulfill_vcampro_license", {
    p_session: session.id, p_env: environment, p_plan: plan, p_code: generateLicenseCode(),
    ...(session.metadata["license_id"] ? { p_license: session.metadata["license_id"] } : {}),
  });
  if (error) throw new Error("Impossible d’enregistrer la licence. Réessayez.");
  return data as { code: string; expiresAt: string; revoked: boolean };
}