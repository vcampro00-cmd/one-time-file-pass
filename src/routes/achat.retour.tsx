import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { claimPurchasedCode } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { formatCode } from "@/lib/codes";

export const Route = createFileRoute("/achat/retour")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s["session_id"] === "string" ? s["session_id"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Votre code — VCAMPRO INSTALLER" },
      { name: "description", content: "Votre code d’accès acheté, valable 10 minutes." },
      { property: "og:title", content: "Votre code — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Code d’accès à usage unique valable 10 minutes." },
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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!session_id) return setRes({ error: "Aucun achat trouvé." });
    claim({ data: { sessionId: session_id, environment: getStripeEnvironment() } })
      .then(setRes)
      .catch(() => setRes({ error: "Impossible de récupérer votre code." }));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session_id]);

  let left = "";
  if (res && "code" in res) {
    const s = Math.max(0, Math.floor((new Date(res.expiresAt).getTime() - now) / 1000));
    left = s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "expiré";
  }

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
            <p className="text-sm text-muted-foreground">
              À usage unique. Temps restant : <span className="font-mono">{left}</span>
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
