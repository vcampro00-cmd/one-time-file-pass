import { useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createCodeCheckout } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

function Checkout() {
  const fetchClientSecret = async () => {
    const r = await createCodeCheckout({
      data: {
        returnUrl: `${window.location.origin}/achat/retour?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  };
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

export function BuyCode() {
  const [open, setOpen] = useState(false);
  const isTest = (import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined)?.startsWith("pk_test_");
  return (
    <div className="space-y-2 border-t border-border pt-6">
      <p className="text-center text-sm text-muted-foreground">Pas de code ?</p>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <ShoppingCart /> Acheter un code — 10 €
      </Button>
      {isTest && <p className="text-center text-xs text-muted-foreground">Mode test : aucun vrai paiement.</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Code d’accès 10 minutes — 10 €</DialogTitle>
          </DialogHeader>
          {open && <Checkout />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
