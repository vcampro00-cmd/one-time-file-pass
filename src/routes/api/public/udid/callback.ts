import { createFileRoute } from "@tanstack/react-router";
import { httpsOrigin, newDeviceToken, parseDeviceAttributes } from "@/lib/udid";
import { isHex32, isLinkUsable } from "@/lib/resellers";

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

        // Optional one-time reseller link: marks the device as reseller (5-month warranty).
        let resellerId: string | null = null;
        const rl = new URL(request.url).searchParams.get("rl");
        if (isHex32(rl)) {
          const { data: link } = await supabaseAdmin.from("reseller_links").select("reseller_id, expires_at, used_at").eq("token", rl).maybeSingle();
          if (isLinkUsable(link)) {
            const { data: claimed } = await supabaseAdmin.from("reseller_links").update({ used_at: new Date().toISOString() }).eq("token", rl).is("used_at", null).select("reseller_id").maybeSingle();
            resellerId = claimed?.reseller_id ?? null;
          }
        }

        const udid = attrs["UDID"]!;
        const { data: existing } = await supabaseAdmin.from("devices").select("id, token").eq("udid", udid).maybeSingle();
        let token = existing?.token;
        if (!token) {
          token = newDeviceToken();
          const { error } = await supabaseAdmin.from("devices").insert({
            token,
            udid,
            product: attrs["PRODUCT"] ?? null,
            ios_version: attrs["VERSION"] ?? null,
            serial: attrs["SERIAL"] ?? null,
            reseller: !!resellerId,
            reseller_id: resellerId,
          });
          if (error) return new Response("Erreur", { status: 500 });
        } else if (resellerId && existing) {
          await supabaseAdmin.from("devices").update({ reseller: true, reseller_id: resellerId }).eq("id", existing.id);
        }
        return new Response(null, { status: 301, headers: { Location: `${httpsOrigin(request.url)}/appareil/${token}` } });
      },
    },
  },
});
