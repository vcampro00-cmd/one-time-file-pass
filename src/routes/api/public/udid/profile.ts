import { createFileRoute } from "@tanstack/react-router";
import { buildUdidProfile, httpsOrigin } from "@/lib/udid";
import { isHex32, isLinkUsable } from "@/lib/resellers";
import { verifyPurchaseCertification } from "@/lib/profile-token";

export const Route = createFileRoute("/api/public/udid/profile")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rl = new URL(request.url).searchParams.get("rl");
        let suffix = "";
        const pc = new URL(request.url).searchParams.get("pc");
        if (pc !== null) {
          const secret = process.env["DNS_PROFILE_SIGNING_SECRET"];
          if (!secret || !await verifyPurchaseCertification(secret, pc)) return new Response("Lien expiré", { status: 410 });
          suffix = `?pc=${encodeURIComponent(pc)}`;
        }
        if (rl !== null) {
          if (!isHex32(rl)) return new Response("Lien invalide", { status: 404 });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: link } = await supabaseAdmin.from("reseller_links").select("expires_at, used_at").eq("token", rl).maybeSingle();
          if (!isLinkUsable(link)) return new Response("Lien expiré ou déjà utilisé", { status: 410 });
          suffix = `?rl=${rl}`;
        }
        return new Response(buildUdidProfile(`${httpsOrigin(request.url)}/api/public/udid/callback${suffix}`, crypto.randomUUID().toUpperCase()), {
          headers: {
            "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
            "Content-Disposition": 'attachment; filename="VCAMPRO-Certification.mobileconfig"',
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
