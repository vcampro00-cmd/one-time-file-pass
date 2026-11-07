import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand-logo";
import { createResellerLink, getResellerPanel } from "@/lib/resellers.functions";
import { isLinkUsable } from "@/lib/resellers";

export const Route = createFileRoute("/revendeur/$key")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace revendeur — VCAMPRO INSTALLER" },
      { name: "description", content: "Espace privé des revendeurs VCAMPRO INSTALLER." },
      { property: "og:title", content: "Espace revendeur — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Espace privé des revendeurs VCAMPRO INSTALLER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResellerPanel,
});

function ResellerPanel() {
  const { key } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getResellerPanel);
  const create = useServerFn(createResellerLink);
  const panel = useQuery({ queryKey: ["reseller", key], queryFn: () => load({ data: { key } }), refetchInterval: 15000 });
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const urlOf = (t: string) => `${window.location.origin}/api/public/udid/profile?rl=${t}`;

  useEffect(() => {
    if (!current) { setQr(null); return; }
    QRCode.toDataURL(urlOf(current), { width: 320, margin: 2 }).then(setQr);
  }, [current]);

  async function newDevice() {
    setBusy(true);
    const res = await create({ data: { key, label } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    setCurrent(res.token);
    setLabel("");
    qc.invalidateQueries({ queryKey: ["reseller", key] });
  }

  if (panel.isLoading) return <main className="p-10 text-center text-muted-foreground">Chargement…</main>;
  const p = panel.data;
  if (!p) return <main className="p-10 text-center">Lien revendeur invalide ou désactivé.</main>;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <BrandLogo />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Espace revendeur</p>
          <h1 className="text-2xl font-bold">{p.name}</h1>
        </div>
        <div className="rounded-md border border-primary/40 px-4 py-2 text-center">
          <p className="font-mono text-3xl font-bold text-primary">{p.credits}</p>
          <p className="text-xs text-muted-foreground">crédit{p.credits > 1 ? "s" : ""}</p>
        </div>
      </header>

      <section className="space-y-3 rounded-lg border border-border p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Smartphone className="size-5" /> Nouvel appareil</h2>
        <p className="text-sm text-muted-foreground">Chaque appareil utilise 1 crédit. Le lien est valable 24 h pour un seul iPhone, garantie 5 mois.</p>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom du client (facultatif)" maxLength={80} />
        <Button variant="brand" className="w-full" disabled={busy || p.credits < 1} onClick={newDevice}>
          <Plus /> {p.credits < 1 ? "Crédits insuffisants" : busy ? "Création…" : "Certifier un appareil (1 crédit)"}
        </Button>
        {current && (
          <div className="space-y-3 pt-2 text-center">
            {qr && <img src={qr} alt="QR code de certification" className="mx-auto rounded-md bg-foreground p-2" width={240} height={240} />}
            <p className="text-sm text-muted-foreground">Scannez avec l'appareil photo de l'iPhone ou envoyez le lien.</p>
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(urlOf(current)); toast.success("Lien copié"); }}><Copy /> Copier le lien</Button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Historique</h2>
        {p.links.length === 0 && <p className="text-sm text-muted-foreground">Aucun appareil pour l'instant.</p>}
        <ul className="divide-y divide-border">
          {p.links.map((l) => (
            <li key={l.token} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("fr-FR")}</span>
              <span>{l.label || "—"}</span>
              <Badge variant={l.used_at ? "default" : "outline"} className="ml-auto">{l.used_at ? "Certifié" : isLinkUsable(l) ? "En attente" : "Expiré"}</Badge>
              {isLinkUsable(l) && <Button size="sm" variant="ghost" onClick={() => setCurrent(l.token)}>QR</Button>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
