import { createServerFn } from "@tanstack/react-start";
import { isHex32, linkExpiry, normalizeUsername, randomHex, sessionExpiry, sha256Hex, verifyPassword } from "@/lib/resellers";

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
