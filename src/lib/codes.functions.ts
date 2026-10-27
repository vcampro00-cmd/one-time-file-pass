import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { expiresAtFrom, generateCode, hashCode, normalizeCode, CODE_LENGTH } from "./codes";

export const createAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileIds: string[] }) => {
    if (!Array.isArray(input.fileIds) || input.fileIds.length === 0 || input.fileIds.length > 200)
      throw new Error("Sélectionnez au moins un fichier");
    return { fileIds: input.fileIds.map(String) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owned, error: fe } = await supabase
      .from("files")
      .select("id")
      .in("id", data.fileIds);
    if (fe) throw new Error(fe.message);
    if (!owned || owned.length !== data.fileIds.length) throw new Error("Fichier invalide");

    const code = generateCode();
    const expiresAt = expiresAtFrom(new Date());
    const { data: row, error } = await supabase
      .from("access_codes")
      .insert({ owner_id: userId, code_hash: await hashCode(code), expires_at: expiresAt.toISOString() })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: le } = await supabase
      .from("access_code_files")
      .insert(data.fileIds.map((file_id) => ({ code_id: row.id, file_id })));
    if (le) throw new Error(le.message);

    return { code, expiresAt: expiresAt.toISOString() };
  });

// Public: a visitor redeems a password once.
export const redeemAccessCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    const code = normalizeCode(String(input?.code ?? ""));
    if (code.length !== CODE_LENGTH) throw new Error("Code invalide");
    return { code };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await hashCode(data.code);
    const nowIso = new Date().toISOString();

    // Atomic: only succeeds if unused and not expired.
    const { data: claimed, error } = await supabaseAdmin
      .from("access_codes")
      .update({ used_at: nowIso })
      .eq("code_hash", hash)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Erreur lors de la vérification du code");
    if (!claimed) return { ok: false as const, files: [] };

    const { data: links } = await supabaseAdmin
      .from("access_code_files")
      .select("files(id, name, size, storage_path)")
      .eq("code_id", claimed.id);

    const files = [];
    for (const l of links ?? []) {
      const f = l.files as unknown as { id: string; name: string; size: number; storage_path: string } | null;
      if (!f) continue;
      const { data: signed } = await supabaseAdmin.storage
        .from("files")
        .createSignedUrl(f.storage_path, 60 * 10, { download: f.name });
      if (signed) files.push({ id: f.id, name: f.name, size: f.size, url: signed.signedUrl });
    }
    return { ok: true as const, files };
  });
