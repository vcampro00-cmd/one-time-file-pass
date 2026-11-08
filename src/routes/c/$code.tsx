import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { isLinkUsable, isShortCode } from "@/lib/resellers";

// Short public certification link: /c/ABC123 redirects to the full profile download.
export const Route = createFileRoute("/c/$code")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "VCAMPRO INSTALLER — Certification" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ params }) => {
    const code = params.code.toUpperCase();
    if (!isShortCode(code)) throw notFound();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("reseller_links")
      .select("token, expires_at, used_at")
      .eq("short_code", code)
      .maybeSingle();
    if (!isLinkUsable(link)) throw notFound();
    throw redirect({ href: `/api/public/udid/profile?rl=${link!.token}` });
  },
  component: () => null,
  notFoundComponent: () => (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-muted-foreground">Lien invalide, expiré ou déjà utilisé.</p>
    </main>
  ),
});
