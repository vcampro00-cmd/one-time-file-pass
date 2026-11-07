import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Minus, Plus, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { randomHex, sha256Hex } from "@/lib/resellers";

type Reseller = { id: string; name: string; credits: number; active: boolean; created_at: string };

export function ResellersPanel() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["resellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resellers").select("id, name, credits, active, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reseller[];
    },
  });
  const [name, setName] = useState("");
  const [credits, setCredits] = useState(5);
  const [lastLink, setLastLink] = useState<{ name: string; url: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["resellers"] });
  const panelUrl = (key: string) => `${window.location.origin}/revendeur/${key}`;

  async function add() {
    if (!name.trim()) return;
    const key = randomHex();
    const { error } = await supabase.from("resellers").insert({ name: name.trim(), credits: Math.max(0, credits), access_key_hash: await sha256Hex(key) });
    if (error) { toast.error("Échec de la création"); return; }
    setLastLink({ name: name.trim(), url: panelUrl(key) });
    setName("");
    refresh();
  }

  async function setCreditsOf(r: Reseller, value: number) {
    const { error } = await supabase.from("resellers").update({ credits: Math.max(0, value) }).eq("id", r.id);
    if (error) toast.error("Échec"); else refresh();
  }

  async function newKey(r: Reseller) {
    if (!window.confirm(`Créer un nouveau lien pour ${r.name} ? L'ancien lien ne fonctionnera plus.`)) return;
    const key = randomHex();
    const { error } = await supabase.from("resellers").update({ access_key_hash: await sha256Hex(key) }).eq("id", r.id);
    if (error) { toast.error("Échec"); return; }
    setLastLink({ name: r.name, url: panelUrl(key) });
  }

  async function toggle(r: Reseller) {
    const { error } = await supabase.from("resellers").update({ active: !r.active }).eq("id", r.id);
    if (error) toast.error("Échec"); else refresh();
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 py-6">
      <h2 className="text-2xl font-bold">Revendeurs</h2>
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
        <Input className="max-w-xs" placeholder="Nom du revendeur" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="w-24" type="number" min={0} aria-label="Crédits" value={credits} onChange={(e) => setCredits(Number(e.target.value) || 0)} />
        <Button variant="brand" onClick={add} disabled={!name.trim()}><UserPlus /> Ajouter</Button>
      </div>
      {lastLink && (
        <div className="space-y-2 rounded-lg border border-primary/50 p-4">
          <p className="text-sm">Lien privé de <b>{lastLink.name}</b> (affiché une seule fois, envoyez-le maintenant) :</p>
          <p className="break-all font-mono text-xs">{lastLink.url}</p>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(lastLink.url); toast.success("Lien copié"); }}><Copy /> Copier</Button>
        </div>
      )}
      <ul className="divide-y divide-border">
        {(list.data ?? []).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 py-3">
            <span className={`mr-auto font-semibold ${r.active ? "" : "text-muted-foreground line-through"}`}>{r.name}</span>
            <Button size="icon" variant="outline" aria-label="Retirer un crédit" onClick={() => setCreditsOf(r, r.credits - 1)}><Minus /></Button>
            <span className="w-16 text-center font-mono text-lg">{r.credits}</span>
            <Button size="icon" variant="outline" aria-label="Ajouter un crédit" onClick={() => setCreditsOf(r, r.credits + 1)}><Plus /></Button>
            <Button size="sm" variant="outline" onClick={() => setCreditsOf(r, r.credits + 5)}>+5</Button>
            <Button size="sm" variant="outline" onClick={() => setCreditsOf(r, r.credits + 10)}>+10</Button>
            <Button size="sm" variant="ghost" onClick={() => newKey(r)}><RefreshCw /> Nouveau lien</Button>
            <Button size="sm" variant="ghost" onClick={() => toggle(r)}>{r.active ? "Désactiver" : "Activer"}</Button>
          </li>
        ))}
        {list.data?.length === 0 && <li className="py-3 text-sm text-muted-foreground">Aucun revendeur.</li>}
      </ul>
    </section>
  );
}
