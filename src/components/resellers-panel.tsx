import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, KeyRound, Minus, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { hashPassword, isValidUsername, MIN_PASSWORD_LENGTH, normalizeUsername, randomHex, sha256Hex } from "@/lib/resellers";
import { deviceStatus } from "@/lib/device-status";
import { RESELLER_WARRANTY_MONTHS, warrantyEnd } from "@/lib/warranty";

type Reseller = { id: string; name: string; username: string | null; credits: number; active: boolean; created_at: string };

export function ResellersPanel() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["resellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resellers").select("id, name, username, credits, active, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reseller[];
    },
  });
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [credits, setCredits] = useState(5);
  const refresh = () => qc.invalidateQueries({ queryKey: ["resellers"] });
  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/revendeur` : "/revendeur";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (!name.trim()) { toast.error("Indiquez le nom"); return; }
    if (!isValidUsername(u)) { toast.error("Identifiant : 3 à 32 lettres, chiffres, . _ -"); return; }
    if (password.length < MIN_PASSWORD_LENGTH) { toast.error(`Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum`); return; }
    const { error } = await supabase.from("resellers").insert({
      name: name.trim(), username: u, password_hash: await hashPassword(password),
      credits: Math.max(0, credits), access_key_hash: await sha256Hex(randomHex()),
    });
    if (error) { toast.error(error.code === "23505" ? "Identifiant déjà utilisé" : "Échec de la création"); return; }
    navigator.clipboard?.writeText(`${loginUrl}\nIdentifiant : ${u}\nMot de passe : ${password}`).catch(() => {});
    toast.success("Revendeur créé — accès copiés");
    setName(""); setUsername(""); setPassword("");
    refresh();
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-2xl font-bold">Revendeurs</h2>
        <span className="font-mono text-xs text-muted-foreground">Page de connexion : {loginUrl}</span>
      </div>
      <form onSubmit={add} className="grid gap-2 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_1fr_6rem_auto]">
        <Input placeholder="Nom du revendeur" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Identifiant" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input type="number" min={0} aria-label="Crédits" value={credits} onChange={(e) => setCredits(Number(e.target.value) || 0)} />
        <Button type="submit" variant="brand"><UserPlus /> Créer</Button>
      </form>
      <ul className="divide-y divide-border border-y border-border">
        {(list.data ?? []).map((r) => <ResellerRow key={r.id} r={r} onChange={refresh} />)}
        {list.data?.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun revendeur.</li>}
      </ul>
    </section>
  );
}

function ResellerRow({ r, onChange }: { r: Reseller; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const devices = useQuery({
    queryKey: ["reseller-devices", r.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, token, product, serial, ready_at, cancelled_at, ipa_path, created_at").eq("reseller_id", r.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function update(values: Partial<{ credits: number; active: boolean; password_hash: string }>) {
    const { error } = await supabase.from("resellers").update(values).eq("id", r.id);
    if (error) toast.error("Échec"); else onChange();
  }

  async function newPassword() {
    const p = window.prompt(`Nouveau mot de passe pour ${r.name} :`);
    if (!p) return;
    if (p.length < MIN_PASSWORD_LENGTH) { toast.error(`${MIN_PASSWORD_LENGTH} caractères minimum`); return; }
    await update({ password_hash: await hashPassword(p) });
    toast.success("Mot de passe modifié");
  }

  async function remove() {
    if (!window.confirm(`Supprimer définitivement le revendeur ${r.name} ? Ses appareils restent dans la liste.`)) return;
    const { error } = await supabase.from("resellers").delete().eq("id", r.id);
    if (error) toast.error("Échec de la suppression"); else { toast.success("Revendeur supprimé"); onChange(); }
  }

  return (
    <li className="space-y-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="mr-auto flex items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          <span className={`font-semibold ${r.active ? "" : "text-muted-foreground line-through"}`}>{r.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{r.username ?? "sans identifiant"}</span>
        </button>
        <Button size="icon" variant="outline" aria-label="Retirer un crédit" onClick={() => update({ credits: Math.max(0, r.credits - 1) })}><Minus /></Button>
        <span className="w-14 text-center font-mono text-lg">{r.credits}</span>
        <Button size="icon" variant="outline" aria-label="Ajouter un crédit" onClick={() => update({ credits: r.credits + 1 })}><Plus /></Button>
        <Button size="sm" variant="outline" onClick={() => update({ credits: r.credits + 5 })}>+5</Button>
        <Button size="sm" variant="outline" onClick={() => update({ credits: r.credits + 10 })}>+10</Button>
        <Button size="sm" variant="ghost" onClick={newPassword}><KeyRound /> Mot de passe</Button>
        <Button size="sm" variant="ghost" onClick={() => update({ active: !r.active })}>{r.active ? "Désactiver" : "Activer"}</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}><Trash2 /> Supprimer</Button>
      </div>
      {open && (
        <div className="ml-6 rounded-md border border-border p-3">
          <p className="mb-2 text-sm font-semibold">Appareils certifiés par {r.name}</p>
          {devices.isPending && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {devices.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun appareil pour l'instant.</p>}
          <ul className="space-y-1">
            {devices.data?.map((d) => {
              const st = deviceStatus(d);
              const end = d.ready_at ? warrantyEnd(new Date(d.ready_at), RESELLER_WARRANTY_MONTHS) : null;
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground">{new Date(d.created_at).toLocaleString("fr-FR")}</span>
                  <span>{d.product}{d.serial ? ` · Série ${d.serial}` : ""}</span>
                  {end && <span className={end.getTime() < Date.now() ? "text-destructive" : "text-muted-foreground"}>Garantie jusqu'au {end.toLocaleDateString("fr-FR")}</span>}
                  <Badge variant={st === "certified" ? "default" : "outline"} className="ml-auto">{st === "certified" ? "Certifié" : st === "pending" ? "En attente" : "Annulé"}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
