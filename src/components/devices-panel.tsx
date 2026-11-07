import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; token: string; udid: string; product: string | null; ios_version: string | null; ready_at: string | null; app_name: string | null; created_at: string };

export function DevicesPanel() {
  const qc = useQueryClient();
  const devices = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, token, udid, product, ios_version, ready_at, app_name, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
    refetchInterval: 15000,
  });
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/appareil`;

  return (
    <section className="lock-card mx-auto mb-16 max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Appareils à certifier</h2>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Lien copié"); }}>
          <Copy /> Copier le lien « Certifier l'appareil »
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href="https://maplesign.ca" target="_blank" rel="noreferrer">
            <ExternalLink /> Ouvrir MapleSign
          </a>
        </Button>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {devices.data?.map((d) => <DeviceRow key={d.id} d={d} onChange={() => qc.invalidateQueries({ queryKey: ["devices"] })} />)}
        {devices.data?.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun appareil pour le moment.</li>}
      </ul>
    </section>
  );
}

function DeviceRow({ d, onChange }: { d: Row; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(d.app_name ?? "VCAMPRO — Dopamine");
  const [bundle, setBundle] = useState("com.opa334.Dopamine");
  const [version, setVersion] = useState("1.0");
  const [busy, setBusy] = useState(false);

  async function publish() {
    if (!file) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const path = `${u.user!.id}/devices/${d.id}/${crypto.randomUUID()}.ipa`;
    const { error } = await supabase.storage.from("files").upload(path, file, { contentType: "application/octet-stream" });
    if (!error) {
      const { error: e2 } = await supabase.from("devices").update({ ipa_path: path, app_name: name, bundle_id: bundle, app_version: version, ready_at: new Date().toISOString() }).eq("id", d.id);
      if (e2) toast.error("Échec de l'enregistrement"); else toast.success("Installation disponible pour le client");
    } else toast.error("Échec de l'import");
    setBusy(false);
    onChange();
  }

  async function remove() {
    await supabase.from("devices").delete().eq("id", d.id);
    onChange();
  }

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("fr-FR")} · {d.product} · iOS {d.ios_version}</span>
        <Badge variant={d.ready_at ? "default" : "outline"}>{d.ready_at ? "prêt" : "en attente"}</Badge>
        <Button size="icon" variant="ghost" className="ml-auto" asChild aria-label="Ouvrir la page client"><a href={`/appareil/${d.token}`} target="_blank" rel="noreferrer"><ExternalLink /></a></Button>
        <Button size="icon" variant="ghost" onClick={remove} aria-label="Supprimer"><Trash2 /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-sm">{d.udid}</span>
        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(d.udid); toast.success("UDID copié"); }}><Copy /> Copier</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom affiché" />
        <Input value={bundle} onChange={(e) => setBundle(e.target.value)} placeholder="Bundle ID" />
        <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input type="file" accept=".ipa" className="max-w-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button disabled={!file || busy} onClick={publish}><Upload /> {busy ? "Importation..." : "Publier l'IPA signé"}</Button>
      </div>
    </li>
  );
}
