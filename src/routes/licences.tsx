import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CreditCard, RefreshCw, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { licenseCodeSchema, licenseHead, LICENSE_PLANS } from "@/lib/licenses";
import { lookupLicense } from "@/lib/licenses.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { LicenseShell } from "@/components/license-shell";
import { LicenseCheckout } from "@/components/license-checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/licences")({
  staticData: { sitemap: false },
  head: () => licenseHead("Licences VCAMPRO", "Achetez ou renouvelez votre licence VCAMPRO pour 7 ou 30 jours."),
  component: Licences,
});

function Licences() {
  const lookup = useServerFn(lookupLicense);
  const [code, setCode] = useState("");
  const [checkedCode, setCheckedCode] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupLicense>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<{ plan: "week" | "month"; code?: string } | null>(null);
  async function check(e: React.FormEvent) {
    e.preventDefault();
    const parsed = licenseCodeSchema.safeParse(code);
    if (!parsed.success) { toast.error("Saisissez votre code de licence complet."); return; }
    setBusy(true); setResult(null);
    try { setResult(await lookup({ data: { code: parsed.data, environment: getStripeEnvironment() } })); setCheckedCode(parsed.data); }
    catch { toast.error("Vérification indisponible. Réessayez."); }
    finally { setBusy(false); }
  }
  return <LicenseShell>
    <div className="mb-10 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-accent" /><div><h1 className="text-3xl font-bold">Licences VCAMPRO</h1><p className="mt-2 text-muted-foreground">Paiement unique · Renouvellement manuel</p></div></div>
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section><h2 className="mb-5 text-xl font-semibold">Nouvelle licence</h2><div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(LICENSE_PLANS) as ("week" | "month")[]).map(plan => <article key={plan} className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
          <KeyRound className="text-accent" /><h3 className="text-xl font-semibold">{LICENSE_PLANS[plan].label}</h3><p className="text-4xl font-bold">{LICENSE_PLANS[plan].amount / 100} €</p><p className="text-sm text-muted-foreground">Sans abonnement</p><Button onClick={() => setCheckout({ plan })}><CreditCard />Acheter</Button>
        </article>)}
      </div></section>
      <section className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"><h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><RefreshCw className="text-accent" />Ma licence</h2>
        <form onSubmit={check} className="space-y-4"><Label htmlFor="license-code">Code de licence</Label><Input id="license-code" value={code} maxLength={47} onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }} placeholder="VC-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX" className="font-mono text-xs" required /><Button variant="outline" type="submit" disabled={busy}>{busy ? "Vérification…" : "Vérifier la licence"}</Button></form>
        {result && <div className="mt-6 space-y-4 border-t border-border pt-5"><p className={result.active ? "text-success" : "text-destructive"}>{!result.found ? "Licence introuvable" : result.revoked ? "Licence suspendue" : result.active ? "Licence active" : "Licence expirée"}</p>{result.expiresAt && <p className="text-sm text-muted-foreground">Validité : {new Date(result.expiresAt).toLocaleString("fr-FR")}</p>}
          {result.found && !result.revoked && <div className="flex flex-wrap gap-2"><Button onClick={() => setCheckout({ plan: "week", code: checkedCode })}>Renouveler 7 jours · 15 €</Button><Button variant="outline" onClick={() => setCheckout({ plan: "month", code: checkedCode })}>30 jours · 60 €</Button></div>}
        </div>}
      </section>
    </div>
    <footer className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground"><Link to="/">VCAMPRO INSTALLER</Link></footer>
    <Dialog open={Boolean(checkout)} onOpenChange={open => { if (!open) setCheckout(null); }}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>{checkout?.code ? "Renouveler la licence" : "Acheter une licence"}</DialogTitle></DialogHeader>{checkout && <LicenseCheckout plan={checkout.plan} code={checkout.code} />}</DialogContent></Dialog>
  </LicenseShell>;
}