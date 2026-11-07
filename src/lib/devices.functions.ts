import { createServerFn } from "@tanstack/react-start";
import { canInstallDevice } from "@/lib/device-status";

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
      .select("app_name, ready_at, ipa_path, cancelled_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!d) return null;
    return { appName: d.app_name, ready: canInstallDevice(d), cancelled: !!d.cancelled_at };
  });
