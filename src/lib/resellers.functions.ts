import { createServerFn } from "@tanstack/react-start";
import { isHex32, linkExpiry, randomHex, sha256Hex } from "@/lib/resellers";

// Public: reseller panel, reachable only with the secret access key.
export const getResellerPanel = createServerFn({ method: "POST" })
  .validator((input: { key: string }) => {
    if (!isHex32(input?.key)) throw new Error("Lien invalide");
    return { key: input.key };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("resellers")
      .select("id, name, credits, active")
      .eq("access_key_hash", await sha256Hex(data.key))
      .maybeSingle();
    if (!r || !r.active) return null;
    const { data: links } = await supabaseAdmin
      .from("reseller_links")
      .select("token, label, expires_at, used_at, created_at")
      .eq("reseller_id", r.id)
      .order("created_at", { ascending: false })
      .limit(30);
    return { name: r.name, credits: r.credits, links: links ?? [] };
  });

// Public: spends 1 credit atomically and returns a one-time certification link.
export const createResellerLink = createServerFn({ method: "POST" })
  .validator((input: { key: string; label?: string }) => {
    if (!isHex32(input?.key)) throw new Error("Lien invalide");
    return { key: input.key, label: String(input?.label ?? "").trim().slice(0, 80) || null };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = randomHex();
    const { data: left, error } = await supabaseAdmin.rpc("consume_reseller_credit", {
      _key_hash: await sha256Hex(data.key),
      _token: token,
      _label: data.label ?? "",
      _expires: linkExpiry().toISOString(),
    });
    if (error) return { ok: false as const, error: "Erreur, réessayez" };
    if (left === -1) return { ok: false as const, error: "Crédits insuffisants" };
    return { ok: true as const, token, credits: left as number };
  });
