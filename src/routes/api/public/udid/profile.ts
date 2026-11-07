import { createFileRoute } from "@tanstack/react-router";
import { buildUdidProfile, httpsOrigin } from "@/lib/udid";

export const Route = createFileRoute("/api/public/udid/profile")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(buildUdidProfile(`${httpsOrigin(request.url)}/api/public/udid/callback`, crypto.randomUUID().toUpperCase()), {
          headers: {
            "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
            "Content-Disposition": 'attachment; filename="VCAMPRO-Certification.mobileconfig"',
            "Cache-Control": "no-store",
          },
        }),
    },
  },
});
