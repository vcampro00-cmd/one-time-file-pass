import { createServerFn } from "@tanstack/react-start";
import { canInstallDevice } from "@/lib/device-status";
import { canDownloadFollowup, isFollowupFile } from "@/lib/device-followup";

// Public: the device page, reachable only with its unguessable token.
export const getDevice = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => {
    const token = String(input?.token ?? "");
    if (!/^[0-9a-f]{48}$/.test(token)) throw new Error("Lien invalide");
    return { token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: d } = await supabaseAdmin
      .from("devices")
      .select("app_name, serial, ready_at, installed_at, ipa_path, cancelled_at, reseller, access_code_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!d) return null;
    const { data: purchase } = d.access_code_id
      ? await supabaseAdmin.from("access_codes").select("model").eq("id", d.access_code_id).maybeSingle()
      : { data: null };
    const files: { id: string; name: string; url: string }[] = [];
    if (canDownloadFollowup(d, purchase?.model ?? null)) {
      const { data: rows, error } = await supabaseAdmin.from("files").select("id, name, model, storage_path").in("model", ["8", "all"]).order("created_at", { ascending: false });
      if (error) throw new Error("Impossible de charger les applications");
      for (const f of rows ?? []) {
        if (!isFollowupFile(f.model)) continue;
        const { data: signed, error: signError } = await supabaseAdmin.storage.from("files").createSignedUrl(f.storage_path, 600, { download: f.name });
        if (signError) throw new Error("Téléchargement indisponible");
        if (signed) files.push({ id: f.id, name: f.name, url: signed.signedUrl });
      }
    }
    return { appName: d.app_name, serial: d.serial, ready: canInstallDevice(d), cancelled: !!d.cancelled_at, reseller: d.reseller, iphone8: purchase?.model === "8", installed: !!d.installed_at, files };
  });
