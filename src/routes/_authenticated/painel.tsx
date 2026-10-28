import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, LogOut, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { createAccessCode } from "@/lib/codes.functions";
import { codeStatus, formatCode } from "@/lib/codes";

export const Route = createFileRoute("/_authenticated/painel")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Tableau de bord — VCAMPRO INSTALLER" },
      { name: "description", content: "Importez des fichiers et générez des codes à usage unique." },
      { property: "og:title", content: "Tableau de bord — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Importez des fichiers et générez des codes à usage unique." },
      { property: "og:site_name", content: "VCAMPRO INSTALLER" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Painel,
});

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Painel() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const createCode = useServerFn(createAccessCode);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [latest, setLatest] = useState<{ code: string; expiresAt: string } | null>(null);
  const now = useNow();

  const files = useQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const { data, error } = await supabase.from("files").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const codes = useQuery({
    queryKey: ["codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_codes")
        .select("id, expires_at, used_at, created_at, access_code_files(count)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    for (const file of Array.from(list)) {
      const path = `${u.user!.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("files").upload(path, file);
      if (error) {
        toast.error(`Échec de l’import de ${file.name}`);
        continue;
      }
      await supabase.from("files").insert({ name: file.name, storage_path: path, size: file.size });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    qc.invalidateQueries({ queryKey: ["files"] });
    toast.success("Fichiers importés");
  }

  async function remove(id: string, path: string) {
    await supabase.storage.from("files").remove([path]);
    await supabase.from("files").delete().eq("id", id);
    selected.delete(id);
    setSelected(new Set(selected));
    qc.invalidateQueries({ queryKey: ["files"] });
  }

  async function generate() {
    try {
      const res = await createCode({ data: { fileIds: [...selected] } });
      setLatest(res);
      qc.invalidateQueries({ queryKey: ["codes"] });
    } catch (e) {
      toast.error("Impossible de générer le code. Vérifiez les fichiers sélectionnés et réessayez.");
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const remaining = latest ? Math.max(0, new Date(latest.expiresAt).getTime() - now.getTime()) : 0;

  return (
    <main className="grid-paper min-h-screen">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo className="h-14 w-24 shrink-0 sm:h-16 sm:w-28" />
          <span className="font-mono text-xs font-bold break-words">TABLEAU DE BORD</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut /> Déconnexion
        </Button>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <section className="lock-card rounded-3xl p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Fichiers</h2>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload /> {uploading ? "Importation..." : "Importer des fichiers"}
            </Button>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {files.data?.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggle(f.id)} />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{(f.size / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo</span>
                <Button size="icon" variant="ghost" onClick={() => remove(f.id, f.storage_path)} aria-label="Supprimer">
                  <Trash2 />
                </Button>
              </li>
            ))}
            {files.data?.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun fichier pour le moment.</li>}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="lock-card rounded-3xl p-6">
            <h2 className="mb-1 text-xl font-bold">Générer un code</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {selected.size} fichier(s) sélectionné(s). Usage unique, valable 10 minutes.
            </p>
            <button
              type="button"
              className="btn-gradient flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-bold uppercase tracking-wider transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={selected.size === 0}
              onClick={generate}
            >
              <KeyRound className="h-4 w-4" /> Générer un code
            </button>
            {latest && (
              <div className="mt-5 border-2 border-dashed border-accent p-4 text-center">
                <p className="font-mono text-3xl font-bold tracking-[0.2em]">{formatCode(latest.code)}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {remaining > 0
                    ? `expire dans ${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`
                    : "expiré"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(formatCode(latest.code));
                    toast.success("Code copié");
                  }}
                >
                  <Copy /> Copier
                </Button>
              </div>
            )}
          </div>

          <div className="lock-card rounded-3xl p-6">
            <h2 className="mb-3 text-lg font-bold">Codes récents</h2>
            <ul className="space-y-2 text-sm">
              {codes.data?.map((c) => {
                const st = codeStatus(c, now);
                const count = (c.access_code_files as unknown as { count: number }[])[0]?.count ?? 0;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("fr-FR")} · {count} fich.
                    </span>
                    <Badge variant={st === "ativa" ? "default" : "outline"}>{st === "ativa" ? "actif" : st === "usada" ? "utilisé" : "expiré"}</Badge>
                  </li>
                );
              })}
              {codes.data?.length === 0 && <li className="text-muted-foreground">Aucun code généré.</li>}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
