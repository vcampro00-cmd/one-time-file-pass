import { useCallback } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { createLicenseCheckout } from "@/lib/licenses.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export function LicenseCheckout({ plan, code }: { plan: "week" | "month"; code?: string | undefined }) {
  const fetchClientSecret = useCallback(async () => {
    const result = await createLicenseCheckout({ data: { plan, ...(code ? { code } : {}), environment: getStripeEnvironment(), origin: window.location.origin } });
    if ("error" in result) throw new Error(result.error);
    return result.clientSecret;
  }, [plan, code]);
  return <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>;
}