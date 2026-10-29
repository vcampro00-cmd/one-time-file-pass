import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/payments/webhook")({
  staticData: { sitemap: false },
  server: { handlers: { POST: async ({ request }) => {
    const env = new URL(request.url).searchParams.get("env");
    if (env !== "sandbox" && env !== "live") return new Response("Invalid environment", { status: 400 });
    let event;
    try {
      const { verifyLicenseWebhook } = await import("@/lib/license-webhook.server");
      event = await verifyLicenseWebhook(request, env);
    } catch { return new Response("Invalid webhook", { status: 400 }); }
    if ((event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") && event.data.object.metadata?.["kind"] === "vcampro_license" && event.data.object.payment_status === "paid") {
      try {
        const { fulfillLicense } = await import("@/lib/licenses.server");
        await fulfillLicense(event.data.object, env);
      } catch { return new Response("Fulfillment unavailable", { status: 500 }); }
    }
    return Response.json({ received: true });
  } } },
});