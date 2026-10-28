import { createFileRoute } from "@tanstack/react-router";
import { verifyProfileToken } from "@/lib/profile-token";

// Serves the configuration profile only with a valid, unexpired token issued after a code was redeemed.
export const Route = createFileRoute("/api/public/dns-profile")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.DNS_PROFILE_SIGNING_SECRET;
        const token = new URL(request.url).searchParams.get("t") ?? "";
        if (!secret || !(await verifyProfileToken(secret, token))) {
          return new Response("Lien expiré. Saisissez un nouveau code sur vcamproinstaller.com.", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
        const { buildDnsProfile, PROFILE_FILENAME } = await import("@/lib/dns-profile");
        return new Response(buildDnsProfile(), {
          headers: {
            "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
            "Content-Disposition": `attachment; filename="${PROFILE_FILENAME}"`,
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex",
          },
        });
      },
    },
  },
});
