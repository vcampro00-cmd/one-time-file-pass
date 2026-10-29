import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, KeyRound, Search, Ban, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { issueManagedLicense, listManagedLicenses, setLicenseRevoked } from "@/lib/licenses.functions";
import { licenseActive, licenseHead, LICENSE_PLANS } from "@/lib/licenses";
import { getStripeEnvironment } from "@/lib/stripe";
import { LicenseShell } from "@/components/license-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const managedQuery = queryOptions({ queryKey: ["managed-licenses"], queryFn: () => listManagedLicenses() });
export const Route = createFileRoute("/_authenticated/gestion-licences")({
  staticData: { sitemap: false },
  loader: ({ context }) => context.queryClient.ensureQueryData(managedQuery),
  head: () => licenseHead("Gestion des licences", "Gestion propriétaire des licences et paiements VCAMPRO."),
  component: LicenseManagement,
});
function LicenseManagement() {
  const { data } = useSuspenseQuery(managedQuery);
  const qc = useQueryClient();
  const issue = useServerFn(issueManagedLicense);
  const revoke = useServerFn(setLicenseRevoked);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [plan, setPlan] = useState<"week" | "month">("week");
  const [busy, setBusy] = useState(false);
  const env = getStripeEnvironment();
  const licenses = data.licenses.filter(l => l.environment === env);
  const payments = data.payments.filter(p => p.environment === env);
  async function generate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await issue({ data: { label, plan, environment: env } }); await qc.invalidateQueries({ queryKey: ["managed-licenses"] }); setOpen(false); setLabel(""); toast.success("Licence créée"); }
    catch { toast.error("Création impossible"); } finally { setBusy(false); }
  }
  async function toggle(id: string, revoked: boolean) {
    try { await revoke({ data: { id, revoked } }); await qc.invalidateQueries({ queryKey: ["managed-licenses"] }); toast.success("Licence mise à jour"); }
    catch { toast.error("Modification impossible"); }
  }
  return <LicenseShell owner>
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold">Gestion des licences</h1><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Actualiser" onClick={() => qc.invalidateQueries({ queryKey: ["managed-licenses"] })}><RefreshCw /></Button><Button onClick={() => setOpen(true)}><KeyRound />Créer une licence</Button></div></div>
    <div className="mb-10 grid grid-cols-3 border-y border-border py-6"><div><p className="text-sm text-muted-foreground">Licences</p><p className="mt-2 text-3xl font-bold">{licenses.length}</p></div><div><p className="text-sm text-muted-foreground">Actives</p><p className="mt-2 text-3xl font-bold text-success">{licenses.filter(license => licenseActive(license)).length}</p></div><div><p className="text-sm text-muted-foreground">Ventes</p><p className="mt-2 text-3xl font-bold">{payments.reduce((sum, p) => sum + p.amount, 0) / 100} €</p></div></div>
    <div className="relative mb-5 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Rechercher une licence" value={search} onChange={e => setSearch(e.target.value)} placeholder="Client ou code" className="pl-10" /></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr><th className="py-3 pr-4">Client / Code</th><th className="pr-4">Validité</th><th className="pr-4">État</th><th>Actions</th></tr></thead><tbody>{licenses.filter(l => `${l.code} ${l.customer_label}`.toLowerCase().includes(search.toLowerCase())).map(l => <tr key={l.id} className="border-b border-border"><td className="py-4 pr-4"><p className="font-semibold">{l.customer_label || "Achat en ligne"}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{l.code}</p></td><td className="whitespace-nowrap pr-4">{new Date(l.expires_at).toLocaleString("fr-FR")}</td><td className="pr-4">{l.revoked ? "Suspendue" : licenseActive(l) ? "Active" : "Expirée"}</td><td><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Copier le code" onClick={() => navigator.clipboard.writeText(l.code).then(() => toast.success("Code copié")).catch(() => toast.error("Copie indisponible"))}><Copy /></Button><Button size="icon" variant="ghost" aria-label={l.revoked ? "Réactiver la licence" : "Suspendre la licence"} onClick={() => toggle(l.id, !l.revoked)}>{l.revoked ? <Check /> : <Ban />}</Button></div></td></tr>)}</tbody></table>{licenses.length === 0 && <p className="py-12 text-center text-muted-foreground">Aucune licence pour le moment.</p>}</div>
    <section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Paiements récents</h2>{payments.length === 0 ? <p className="text-muted-foreground">Aucun paiement pour le moment.</p> : <ul className="divide-y divide-border">{payments.slice(0, 20).map(p => <li key={p.session_id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{new Date(p.created_at).toLocaleString("fr-FR")} · {p.plan === "week" ? "7 jours" : "30 jours"}</span><span>{p.amount / 100} €</span></li>)}</ul>}</section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Créer une licence manuellement</DialogTitle></DialogHeader><form onSubmit={generate} className="space-y-5"><Label htmlFor="client-label">Client (facultatif)</Label><Input id="client-label" value={label} maxLength={100} onChange={e => setLabel(e.target.value)} /><fieldset><legend className="mb-3 text-sm">Durée</legend><div className="flex gap-3">{(["week", "month"] as const).map(p => <label key={p} className="flex items-center gap-2"><input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} />{LICENSE_PLANS[p].label}</label>)}</div></fieldset><Button type="submit" disabled={busy} className="w-full">{busy ? "Création…" : "Créer sans paiement"}</Button></form></DialogContent></Dialog>
  </LicenseShell>;
}