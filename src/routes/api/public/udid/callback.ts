import { createFileRoute } from "@tanstack/react-router";
import { httpsOrigin, newDeviceToken, parseDeviceAttributes } from "@/lib/udid";

// iOS posts device attributes here after the visitor accepts the profile; it then follows a 301.
export const Route = createFileRoute("/api/public/udid/callback")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const buf = new Uint8Array(await request.arrayBuffer());
        if (buf.length > 64 * 1024) return new Response("Too large", { status: 413 });
        const attrs = parseDeviceAttributes(buf);
        if (!attrs) return new Response("UDID introuvable", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const udid = attrs["UDID"]!;
        const { data: existing } = await supabaseAdmin.from("devices").select("token").eq("udid", udid).maybeSingle();
        let token = existing?.token;
        if (!token) {
          token = newDeviceToken();
          const { error } = await supabaseAdmin.from("devices").insert({
            token,
            udid,
            product: attrs["PRODUCT"] ?? null,
            ios_version: attrs["VERSION"] ?? null,
            serial: attrs["SERIAL"] ?? null,
          });
          if (error) return new Response("Erreur", { status: 500 });
        }
        return new Response(null, { status: 301, headers: { Location: `${httpsOrigin(request.url)}/appareil/${token}` } });
      },
    },
  },
});
