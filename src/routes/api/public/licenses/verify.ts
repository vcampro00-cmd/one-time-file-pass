import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { licenseActive, licenseCodeSchema, licenseEnvSchema } from "@/lib/licenses";

export const Route = createFileRoute("/api/public/licenses/verify")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    try {
      const body = await request.text();
      if (body.length > 1024) return new Response("Payload too large", { status: 413 });
      const input = z.object({ code: licenseCodeSchema, environment: licenseEnvSchema }).parse(JSON.parse(body));
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.from("vcampro_licenses").select("expires_at, revoked").eq("code", input.code).eq("environment", input.environment).maybeSingle();
      if (error) return new Response("Unavailable", { status: 503 });
      return Response.json({ valid: Boolean(data && licenseActive(data)), expiresAt: data?.expires_at ?? null }, { headers: { "Cache-Control": "no-store" } });
    } catch { return new Response("Invalid request", { status: 400 }); }
  } } },
});