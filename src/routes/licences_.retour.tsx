import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { licenseHead } from "@/lib/licenses";
import { claimLicensePayment } from "@/lib/licenses.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { LicenseShell } from "@/components/license-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/licences_/retour")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({ session_id: typeof s["session_id"] === "string" ? s["session_id"] : undefined }),
  head: () => licenseHead("Votre licence", "Consultez votre licence VCAMPRO après paiement."),
  component: LicenseReturn,
});
function LicenseReturn() {
  const { session_id } = Route.useSearch();
  const claim = useServerFn(claimLicensePayment);
  const [result, setResult] = useState<Awaited<ReturnType<typeof claimLicensePayment>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!session_id) { setResult({ error: "Aucun paiement trouvé." }); return; }
    setResult(null);
    try { claim({ data: { sessionId: session_id, environment: getStripeEnvironment() } }).then(setResult).catch(() => setResult({ error: "Vérification indisponible." })); }
    catch { setResult({ error: "Paiement non configuré." }); }
  }, [session_id, attempt]);
  return <LicenseShell><section className="mx-auto max-w-lg space-y-6 py-10 text-center"><h1 className="text-3xl font-bold">Votre licence VCAMPRO</h1>
    {!result && <Loader2 className="mx-auto animate-spin text-accent" />}
    {result && "error" in result && <><p className="text-destructive">{result.error}</p><Button onClick={() => setAttempt(v => v + 1)}>Réessayer</Button></>}
    {result && "code" in result && <><CheckCircle className="mx-auto h-10 w-10 text-success" /><p className="break-all border-y border-border py-6 font-mono text-lg text-accent">{result.code}</p><p>Valable jusqu’au {new Date(result.expiresAt).toLocaleString("fr-FR")}</p><Button onClick={async () => { try { await navigator.clipboard.writeText(result.code); toast.success("Code copié"); } catch { toast.error("Copie indisponible"); } }}><Copy />Copier le code</Button></>}
    <div><Button asChild variant="outline"><Link to="/licences">Ma licence</Link></Button></div>
  </section></LicenseShell>;
}