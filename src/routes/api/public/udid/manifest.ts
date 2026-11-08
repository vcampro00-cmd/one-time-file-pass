import { createFileRoute } from "@tanstack/react-router";
import { buildManifest, httpsOrigin } from "@/lib/udid";
import { canInstallDevice } from "@/lib/device-status";

export const Route = createFileRoute("/api/public/udid/manifest")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const t = new URL(request.url).searchParams.get("t") ?? "";
        if (!/^[0-9a-f]{48}$/.test(t)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: d } = await supabaseAdmin.from("devices").select("*").eq("token", t).maybeSingle();
        if (!d || !canInstallDevice(d) || !d.ipa_path) return new Response("Not found", { status: 404 });
        const { data: signed } = await supabaseAdmin.storage.from("files").createSignedUrl(d.ipa_path, 3600);
        if (!signed) return new Response("Not found", { status: 404 });
        // The iPhone fetches this manifest only when the client confirms installation.
        if (!d.installed_at) await supabaseAdmin.from("devices").update({ installed_at: new Date().toISOString() }).eq("id", d.id);
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
