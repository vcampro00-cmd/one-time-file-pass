import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, Copy, ExternalLink, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { readIpaInfo } from "@/lib/ipa-info";
import { RESELLER_WARRANTY_MONTHS, warrantyEnd } from "@/lib/warranty";
import { deviceStatus, type DeviceStatus } from "@/lib/device-status";

type Row = { id: string; token: string; udid: string; product: string | null; ios_version: string | null; serial: string | null; ready_at: string | null; installed_at: string | null; cancelled_at: string | null; app_name: string | null; created_at: string; reseller: boolean; reseller_id: string | null; resellers: { name: string } | null };

const filters: { value: DeviceStatus; label: string }[] = [
  { value: "installed", label: "Prêts (installés)" },
  { value: "certified", label: "Certifiés · non installés" },
  { value: "pending", label: "En attente" },
  { value: "cancelled", label: "Annulés" },
];

export function DevicesPanel() {
  const [filter, setFilter] = useState<DeviceStatus>("installed");
  const [source, setSource] = useState<string>("all");
  const qc = useQueryClient();
  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, token, udid, product, ios_version, serial, ready_at, installed_at, cancelled_at, app_name, created_at, reseller, reseller_id, resellers(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
    refetchInterval: 15000,
  });
  const sources = new Map<string, string>();
  devices.data?.forEach((d) => { if (d.reseller) sources.set(d.reseller_id ?? "unknown", d.resellers?.name ?? "Revendeur supprimé"); });
  const sourceOf = (d: Row) => (d.reseller ? d.reseller_id ?? "unknown" : "site");
  const bySource = devices.data?.filter((d) => source === "all" || sourceOf(d) === source);
  const sourceOptions = [{ value: "all", label: "Tous" }, { value: "site", label: "Mon site" }, ...[...sources].map(([value, name]) => ({ value, label: `Revendeur · ${name}` }))];
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/appareil`;

  return (
    <section className="mx-auto max-w-5xl py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="mr-auto text-2xl font-bold">Appareils</h2>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié"); }}>
          <Copy /> Lien de certification
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href="https://kravasign.com" target="_blank" rel="noreferrer">
            <ExternalLink /> Ouvrir Kravasign
          </a>
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Origine des appareils">
        {sourceOptions.map(({ value, label }) => <Button key={value} size="sm" variant={source === value ? "brand" : "outline"} aria-pressed={source === value} onClick={() => setSource(value)}>
          {label} <span className="font-mono text-xs">{devices.data?.filter((d) => value === "all" || sourceOf(d) === value).length ?? 0}</span>
        </Button>)}
      </div>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Statut des appareils">
        {filters.map(({ value, label }) => <Button key={value} variant={filter === value ? "brand" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>
          {label} <span className="font-mono text-xs">{bySource?.filter((d) => deviceStatus(d) === value).length ?? 0}</span>
        </Button>)}
      </div>
      {devices.isError && <p role="alert" className="py-4 text-destructive">Impossible de charger les appareils.</p>}
      <ul className="divide-y divide-border border-y border-border">
        {bySource?.filter((d) => deviceStatus(d) === filter).map((d) => <DeviceRow key={d.id} d={d} onChange={() => qc.invalidateQueries({ queryKey: ["devices"] })} />)}
        {devices.isPending && <li className="py-10 text-center text-muted-foreground">Chargement…</li>}
        {bySource && !bySource.some((d) => deviceStatus(d) === filter) && <li className="py-12 text-center text-sm text-muted-foreground">Aucun appareil dans cette catégorie.</li>}
      </ul>
    </section>
  );
}

function DeviceRow({ d, onChange }: { d: Row; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(d.app_name ?? "VCAMPRO");
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (!file) return;
    setBusy(true);
    let bundle: string, version: string;
    try {
      ({ bundleId: bundle, version } = await readIpaInfo(file));
    } catch {
      toast.error("Fichier IPA illisible");
      setBusy(false);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Veuillez vous reconnecter"); setBusy(false); return; }
    const path = `${u.user.id}/devices/${d.id}/${crypto.randomUUID()}.ipa`;
    const { error } = await supabase.storage.from("files").upload(path, file, { contentType: "application/octet-stream" });
    if (!error) {
      const { error: e2 } = await supabase.from("devices").update({ ipa_path: path, app_name: name, bundle_id: bundle, app_version: version, ready_at: new Date().toISOString() }).eq("id", d.id);
      if (e2) toast.error("Échec de l'enregistrement"); else toast.success("Installation disponible pour le client");
    } else toast.error("Échec de l'import");
    setBusy(false);
    onChange();
  }

  async function remove() {
    if (!window.confirm("Supprimer définitivement cet appareil ? Le client pourra le certifier à nouveau.")) return;
    setBusy(true);
    const { error } = await supabase.from("devices").delete().eq("id", d.id);
    setBusy(false);
    if (error) { toast.error("Impossible de supprimer"); return; }
    toast.success("Appareil supprimé");
    onChange();
  }

  async function changeCancellation() {
    if (!d.cancelled_at && !window.confirm("Annuler cet appareil et désactiver son installation ?")) return;
    setBusy(true);
    const { error } = await supabase.from("devices").update({ cancelled_at: d.cancelled_at ? null : new Date().toISOString() }).eq("id", d.id).select("id").single();
    setBusy(false);
    if (error) { toast.error("Impossible de modifier le statut"); return; }
    toast.success(d.cancelled_at ? "Appareil réactivé" : "Appareil annulé");
    onChange();
  }

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("fr-FR")} · {d.product} · iOS {d.ios_version}{d.serial ? ` · Série ${d.serial}` : ""}</span>
        {d.ready_at && (() => { const end = warrantyEnd(new Date(d.ready_at), d.reseller ? RESELLER_WARRANTY_MONTHS : undefined); const expired = end.getTime() < Date.now(); return <span className={`font-mono text-xs ${expired ? "font-semibold text-destructive" : "text-muted-foreground"}`}>Garantie jusqu'au {end.toLocaleDateString("fr-FR")}{expired ? " · EXPIRÉE" : ""}</span>; })()}
        {d.reseller && <Badge variant="outline" className="border-primary text-primary">Revendeur{d.resellers?.name ? ` · ${d.resellers.name}` : ""}</Badge>}
        <Badge variant={deviceStatus(d) === "installed" ? "default" : "outline"}>{filters.find((f) => f.value === deviceStatus(d))?.label}</Badge>
        <Button size="icon" variant="ghost" className="ml-auto" asChild aria-label="Ouvrir la page client"><a href={`/appareil/${d.token}`} target="_blank" rel="noreferrer"><ExternalLink /></a></Button>
        {d.cancelled_at && <Button size="sm" variant="outline" disabled={busy} onClick={changeCancellation}><RotateCcw /> Réactiver</Button>}
        <Button size="sm" variant="outline" className="text-destructive" disabled={busy} onClick={remove}><Ban /> {d.cancelled_at ? "Supprimer" : "Annuler et supprimer"}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-sm">{d.udid}</span>
        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(d.udid); toast.success("UDID copié"); }}><Copy /> Copier</Button>
      </div>
      {!d.cancelled_at && <>
      <Input aria-label="Nom de l'application" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom affiché" className="max-w-xs" />
      <div className="flex flex-wrap items-center gap-2">
        <Input type="file" accept=".ipa" className="max-w-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button disabled={!file || busy} onClick={publish}><Upload /> {busy ? "Importation..." : "Publier l'IPA signé"}</Button>
      </div>
      </>}
    </li>
  );
}
