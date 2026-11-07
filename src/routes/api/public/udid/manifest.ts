import { createFileRoute } from "@tanstack/react-router";
import { buildManifest, httpsOrigin } from "@/lib/udid";

export const Route = createFileRoute("/api/public/udid/manifest")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const t = new URL(request.url).searchParams.get("t") ?? "";
        if (!/^[0-9a-f]{48}$/.test(t)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: d } = await supabaseAdmin.from("devices").select("*").eq("token", t).maybeSingle();
        if (!d?.ipa_path || !d.ready_at) return new Response("Not found", { status: 404 });
        const { data: signed } = await supabaseAdmin.storage.from("files").createSignedUrl(d.ipa_path, 3600);
        if (!signed) return new Response("Not found", { status: 404 });
        return new Response(
          buildManifest({
            ipaUrl: signed.signedUrl,
            bundleId: d.bundle_id ?? "com.vcamproinstaller.app",
            version: d.app_version ?? "1.0",
            title: d.app_name ?? "VCAMPRO",
            iconUrl: `${httpsOrigin(request.url)}/favicon.png`,
          }),
          { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
