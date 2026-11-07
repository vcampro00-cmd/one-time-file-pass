import { createServerFn } from "@tanstack/react-start";

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
      .select("udid, product, ios_version, app_name, ready_at, ipa_path")
      .eq("token", data.token)
      .maybeSingle();
    if (!d) return null;
    return { udid: d.udid, product: d.product, iosVersion: d.ios_version, appName: d.app_name, ready: !!(d.ready_at && d.ipa_path) };
  });
