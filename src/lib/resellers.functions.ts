import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { creditsWithBonus, isHex32, linkExpiry, normalizeUsername, randomHex, sessionExpiry, sha256Hex, verifyPassword } from "@/lib/resellers";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function resellerFromSession(session: string) {
  const db = await admin();
  const { data: s } = await db.from("reseller_sessions").select("reseller_id, expires_at").eq("token_hash", await sha256Hex(session)).maybeSingle();
  if (!s || new Date(s.expires_at).getTime() <= Date.now()) return null;
  const { data: r } = await db.from("resellers").select("id, name, credits, active").eq("id", s.reseller_id).maybeSingle();
  return r && r.active ? r : null;
}

const sessionInput = (input: { session: string }) => {
  if (!isHex32(input?.session)) throw new Error("Session invalide");
  return { session: input.session };
};

// Public: reseller sign-in with the username/password the owner created.
export const resellerLogin = createServerFn({ method: "POST" })
  .validator((input: { username: string; password: string }) => ({
    username: normalizeUsername(String(input?.username ?? "")).slice(0, 32),
    password: String(input?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: r } = await db.from("resellers").select("id, active, password_hash").eq("username", data.username).maybeSingle();
    if (!r || !r.active || !(await verifyPassword(data.password, r.password_hash))) return { ok: false as const, error: "Identifiant ou mot de passe incorrect" };
    const session = randomHex();
    const { error } = await db.from("reseller_sessions").insert({ token_hash: await sha256Hex(session), reseller_id: r.id, expires_at: sessionExpiry().toISOString() });
    if (error) return { ok: false as const, error: "Erreur, réessayez" };
    return { ok: true as const, session };
  });

export const resellerLogout = createServerFn({ method: "POST" })
  .validator(sessionInput)
  .handler(async ({ data }) => {
    await (await admin()).from("reseller_sessions").delete().eq("token_hash", await sha256Hex(data.session));
    return { ok: true };
  });

// Public: the reseller's own panel, scoped by their session.
export const getResellerPanel = createServerFn({ method: "POST" })
  .validator(sessionInput)
  .handler(async ({ data }) => {
    const r = await resellerFromSession(data.session);
    if (!r) return null;
    const { data: links } = await (await admin())
      .from("reseller_links")
      .select("token, label, expires_at, used_at, created_at")
      .eq("reseller_id", r.id)
      .order("created_at", { ascending: false })
      .limit(30);
    return { name: r.name, credits: r.credits, links: links ?? [] };
  });

// Public: spends 1 credit atomically and returns a one-time certification link.
export const createResellerLink = createServerFn({ method: "POST" })
  .validator((input: { session: string; label?: string }) => ({
    ...sessionInput(input),
    label: String(input?.label ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const r = await resellerFromSession(data.session);
    if (!r) return { ok: false as const, error: "Session expirée, reconnectez-vous" };
    const token = randomHex();
    const { data: left, error } = await (await admin()).rpc("consume_reseller_credit_for", {
      _reseller: r.id,
      _token: token,
      _label: data.label,
      _expires: linkExpiry().toISOString(),
    });
    if (error) return { ok: false as const, error: "Erreur, réessayez" };
    if (left === -1) return { ok: false as const, error: "Crédits insuffisants" };
    return { ok: true as const, token, credits: left as number };
  });

export const MAX_CREDITS_PER_PURCHASE = 50;
// Own Stripe product ("Crédits revendeur VCAMPRO"), so checkout never shows the access-code name.
const RESELLER_CREDIT_PRICE_ID = "reseller_credit_pack_eur";
// Older credit price lived on the access-code product; still accepted so a purchase started
// before the switch is credited.
const RESELLER_CREDIT_PRICE_IDS = [RESELLER_CREDIT_PRICE_ID, "reseller_credit_eur"];

// Public: reseller buys prepaid credits (promo: 1 free per 3 paid) for their own account.
export const createResellerCreditCheckout = createServerFn({ method: "POST" })
  .validator((input: { session: string; quantity: number; returnUrl: string; environment: "sandbox" | "live" }) => {
    const q = Math.floor(Number(input?.quantity));
    if (!(q >= 1 && q <= MAX_CREDITS_PER_PURCHASE)) throw new Error("Quantité invalide");
    if (input?.environment !== "sandbox" && input?.environment !== "live") throw new Error("Environnement invalide");
    return { ...sessionInput(input), quantity: q, returnUrl: String(input.returnUrl), environment: input.environment };
  })
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    const r = await resellerFromSession(data.session);
    if (!r) return { error: "Session expirée, reconnectez-vous" };
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const price = (await stripe.prices.list({ lookup_keys: [RESELLER_CREDIT_PRICE_ID] })).data[0];
      if (!price) throw new Error("Prix introuvable");
      const s = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: data.quantity }],
        mode: "payment",
        ui_mode: "embedded_page",
        locale: "fr",
        return_url: data.returnUrl,
        payment_intent_data: { description: `Crédits revendeur VCAMPRO × ${data.quantity}` },
        managed_payments: { enabled: true },
        metadata: { managed_payments: "true", kind: "reseller_credits", reseller_id: r.id },
      } as never);
      return { clientSecret: s.client_secret ?? "" };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

// Public: credits a paid session to its reseller exactly once.
export const claimResellerCredits = createServerFn({ method: "POST" })
  .validator((input: { session: string; checkoutId: string; environment: "sandbox" | "live" }) => {
    if (!/^cs_[A-Za-z0-9_]+$/.test(String(input?.checkoutId))) throw new Error("Session invalide");
    if (input?.environment !== "sandbox" && input?.environment !== "live") throw new Error("Environnement invalide");
    return { ...sessionInput(input), checkoutId: input.checkoutId, environment: input.environment };
  })
  .handler(async ({ data }) => {
    const r = await resellerFromSession(data.session);
    if (!r) return { ok: false as const, error: "Session expirée, reconnectez-vous" };
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const s = await stripe.checkout.sessions.retrieve(data.checkoutId);
      if (s.metadata?.["kind"] !== "reseller_credits" || s.metadata?.["reseller_id"] !== r.id) return { ok: false as const, error: "Achat introuvable" };
      if (s.payment_status !== "paid") return { ok: false as const, error: "Paiement non confirmé" };
      const items = await stripe.checkout.sessions.listLineItems(data.checkoutId, { limit: 5 });
      const qty = items.data.filter((i) => i.price?.lookup_key === RESELLER_CREDIT_PRICE_ID).reduce((n, i) => n + (i.quantity ?? 0), 0);
      if (qty < 1) return { ok: false as const, error: "Achat introuvable" };
      const { data: added, error } = await (await admin()).rpc("add_reseller_credits", { _session: data.checkoutId, _reseller: r.id, _qty: creditsWithBonus(qty) });
      if (error) return { ok: false as const, error: "Erreur, réessayez" };
      return { ok: true as const, added: added ? creditsWithBonus(qty) : 0 };
    } catch (e) {
      return { ok: false as const, error: getStripeErrorMessage(e) };
    }
  });

// Public: reseller changes their own password (requires the current one).
export const changeResellerPassword = createServerFn({ method: "POST" })
  .validator((input: { session: string; current: string; next: string }) => ({
    ...sessionInput(input),
    current: String(input?.current ?? "").slice(0, 200),
    next: String(input?.next ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { hashPassword, MIN_PASSWORD_LENGTH } = await import("@/lib/resellers");
    const r = await resellerFromSession(data.session);
    if (!r) return { ok: false as const, error: "Session expirée, reconnectez-vous" };
    if (data.next.length < MIN_PASSWORD_LENGTH) return { ok: false as const, error: `${MIN_PASSWORD_LENGTH} caractères minimum` };
    const db = await admin();
    const { data: row } = await db.from("resellers").select("password_hash").eq("id", r.id).maybeSingle();
    if (!(await verifyPassword(data.current, row?.password_hash))) return { ok: false as const, error: "Mot de passe actuel incorrect" };
    const { error } = await db.from("resellers").update({ password_hash: await hashPassword(data.next) }).eq("id", r.id);
    return error ? { ok: false as const, error: "Erreur, réessayez" } : { ok: true as const };
  });

// Owner: opens a short session on a reseller's panel. RLS on resellers (operators only) authorizes the caller.
export const openResellerPanelAsOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { resellerId: string }) => {
    if (!/^[0-9a-f-]{36}$/.test(String(input?.resellerId))) throw new Error("Revendeur invalide");
    return { resellerId: input.resellerId };
  })
  .handler(async ({ data, context }) => {
    const { data: visible } = await context.supabase.from("resellers").select("id").eq("id", data.resellerId).maybeSingle();
    if (!visible) return { ok: false as const, error: "Accès refusé" };
    const session = randomHex();
    const { error } = await (await admin()).from("reseller_sessions").insert({ token_hash: await sha256Hex(session), reseller_id: data.resellerId, expires_at: new Date(Date.now() + 3600_000).toISOString() });
    return error ? { ok: false as const, error: "Erreur" } : { ok: true as const, session };
  });
