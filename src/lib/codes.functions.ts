import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CODE_LENGTH,
  expiresAtFrom,
  firstUseExpiry,
  generateCode,
  hashCode,
  isMasterCode,
  normalizeCode,
} from "./codes";
import { certifyUrl, profileUrl, signCertifyToken, signProfileToken, signPurchaseCertification } from "./profile-token";

type StoredFile = { id: string; name: string; size: number; storage_path: string };
type FileLink = { id: string; name: string; size: number; url: string };

export const createAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { fileIds: string[] }) => {
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
  .validator((input: { code: string }) => {
    const code = normalizeCode(String(input?.code ?? ""));
    if (code.length !== CODE_LENGTH && !isMasterCode(code)) throw new Error("Code invalide");
    return { code };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function sign(rows: StoredFile[]): Promise<FileLink[]> {
      const out: FileLink[] = [];
      for (const f of rows) {
        const { data: signed } = await supabaseAdmin.storage
          .from("files")
          .createSignedUrl(f.storage_path, 60 * 10, { download: f.name });
        if (signed) out.push({ id: f.id, name: f.name, size: f.size, url: signed.signedUrl });
      }
      return out;
    }

    async function profileLink(): Promise<string | null> {
      const secret = process.env["DNS_PROFILE_SIGNING_SECRET"];
      return secret ? profileUrl(await signProfileToken(secret)) : null;
    }

    // Certification link signed with the reseller flag, so the device inherits the warranty length.
    async function certifyLink(reseller: boolean): Promise<string | null> {
      const secret = process.env["DNS_PROFILE_SIGNING_SECRET"];
      return secret ? certifyUrl(await signCertifyToken(secret, reseller)) : null;
    }

    // Owner's permanent test code: unlocks every file, is never consumed.
    if (isMasterCode(data.code)) {
      const { data: rows } = await supabaseAdmin
        .from("files")
        .select("id, name, size, storage_path")
        .order("created_at", { ascending: false });
      return { ok: true as const, files: await sign(rows ?? []), profileUrl: await profileLink(), certifyUrl: await certifyLink(false), reseller: false, expiresAt: null as string | null };
    }

    const hash = await hashCode(data.code);
    const nowIso = new Date().toISOString();

    // Valid for its whole 10-minute window: reusable until expires_at, first use is recorded.
    const { data: claimed, error } = await supabaseAdmin
      .from("access_codes")
      .select("id, used_at, expires_at, reseller")
      .eq("code_hash", hash)
      .gt("expires_at", nowIso)
      .maybeSingle();
    if (error) throw new Error("Erreur lors de la vérification du code");
    if (!claimed) return { ok: false as const, files: [] as FileLink[], profileUrl: null, certifyUrl: null, reseller: false, expiresAt: null };
    let expiresAt = claimed.expires_at as string;
    if (!claimed.used_at) {
      // First entry: the 20-minute window starts now.
      const exp = firstUseExpiry(new Date(nowIso)).toISOString();
      const { data: upd } = await supabaseAdmin
        .from("access_codes")
        .update({ used_at: nowIso, expires_at: exp })
        .eq("id", claimed.id)
        .is("used_at", null)
        .select("expires_at")
        .maybeSingle();
      if (upd) expiresAt = upd.expires_at;
      else {
        const { data: again } = await supabaseAdmin.from("access_codes").select("expires_at").eq("id", claimed.id).single();
        if (again) expiresAt = again.expires_at;
      }
    }

    const { data: links } = await supabaseAdmin
      .from("access_code_files")
      .select("files(id, name, size, storage_path)")
      .eq("code_id", claimed.id);

    const rows: StoredFile[] = [];
    for (const l of links ?? []) {
      const f = l.files as unknown as StoredFile | null;
      if (f) rows.push(f);
    }
    const secret = process.env["DNS_PROFILE_SIGNING_SECRET"];
    const certification = secret ? `/api/public/udid/profile?pc=${encodeURIComponent(await signPurchaseCertification(secret, claimed.id))}` : null;
    return { ok: true as const, files: await sign(rows), profileUrl: await profileLink(), certifyUrl: certification, reseller: claimed.reseller, expiresAt: expiresAt as string | null };
  });
