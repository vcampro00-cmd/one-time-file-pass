import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { claimPurchasedCode } from "@/lib/payments.functions";
import { savePurchase } from "@/lib/purchase-store";
import { getStripeEnvironment } from "@/lib/stripe";
import { formatCode } from "@/lib/codes";

export const Route = createFileRoute("/achat/retour")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof s["session_id"] === "string" ? s["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Votre code — VCAMPRO INSTALLER" },
      { name: "description", content: "Votre code d’accès acheté, valable 20 minutes." },
      { property: "og:title", content: "Votre code — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Code d’accès à usage unique valable 20 minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Retour,
});

function Retour() {
  const { session_id } = Route.useSearch();
  const claim = useServerFn(claimPurchasedCode);
  const [res, setRes] = useState<{ code: string; expiresAt: string } | { error: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused: the code is on screen anyway */
    }
  }

  useEffect(() => {
    if (!session_id) return setRes({ error: "Aucun achat trouvé." });
    savePurchase(session_id);
    claim({ data: { sessionId: session_id, environment: getStripeEnvironment() } })
      .then(setRes)
      .catch(() => setRes({ error: "Impossible de récupérer votre code." }));
  }, [session_id]);

  return (
    <main className="grid-paper flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <BrandLogo className="h-20 w-32" />
      <div className="panel w-full max-w-md space-y-5 p-8 text-center">
        {!res && <Loader2 className="mx-auto animate-spin" />}
        {res && "error" in res && <p className="text-destructive">{res.error}</p>}
        {res && "code" in res && (
          <>
            <h1 className="text-2xl font-bold">Merci ! Voici votre code</h1>
            <p className="font-mono text-4xl tracking-[0.2em] text-accent">{formatCode(res.code)}</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => copy(res.code)}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copié !" : "Copier le code"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Les 20 minutes commencent seulement quand vous saisissez le code sur le site.
            </p>
            <Button asChild className="w-full">
              <Link to="/">Utiliser le code maintenant</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
