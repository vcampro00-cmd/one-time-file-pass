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
  head: () => ({
    meta: [
      { title: "Painel — VCAMPRO INSTALLER" },
      { name: "description", content: "Envie arquivos e gere senhas de uso único." },
      { property: "og:title", content: "Painel — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Envie arquivos e gere senhas de uso único." },
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
        toast.error(`Falha ao enviar ${file.name}`);
        continue;
      }
      await supabase.from("files").insert({ name: file.name, storage_path: path, size: file.size });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    qc.invalidateQueries({ queryKey: ["files"] });
    toast.success("Arquivos enviados");
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
      toast.error((e as Error).message);
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
        <div className="flex items-center gap-3">
          <BrandLogo className="h-20 w-32 shrink-0 sm:h-24 sm:w-36" />
          <span className="font-mono text-xs font-bold">PAINEL</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut /> Sair
        </Button>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Arquivos</h2>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload /> {uploading ? "Enviando..." : "Enviar arquivos"}
            </Button>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {files.data?.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <Checkbox checked={selected.has(f.id)} onCheckedChange={() => toggle(f.id)} />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <Button size="icon" variant="ghost" onClick={() => remove(f.id, f.storage_path)} aria-label="Excluir">
                  <Trash2 />
                </Button>
              </li>
            ))}
            {files.data?.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhum arquivo ainda.</li>}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="panel p-6">
            <h2 className="mb-1 text-xl font-bold">Gerar senha</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {selected.size} arquivo(s) selecionado(s). Vale 1 vez, por 10 minutos.
            </p>
            <Button className="w-full" variant="secondary" disabled={selected.size === 0} onClick={generate}>
              <KeyRound /> Gerar senha
            </Button>
            {latest && (
              <div className="mt-5 border-2 border-dashed border-accent p-4 text-center">
                <p className="font-mono text-3xl font-bold tracking-[0.2em]">{formatCode(latest.code)}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {remaining > 0
                    ? `expira em ${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`
                    : "expirada"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(formatCode(latest.code));
                    toast.success("Senha copiada");
                  }}
                >
                  <Copy /> Copiar
                </Button>
              </div>
            )}
          </div>

          <div className="panel p-6">
            <h2 className="mb-3 text-lg font-bold">Senhas recentes</h2>
            <ul className="space-y-2 text-sm">
              {codes.data?.map((c) => {
                const st = codeStatus(c, now);
                const count = (c.access_code_files as unknown as { count: number }[])[0]?.count ?? 0;
                return (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pt-BR")} · {count} arq.
                    </span>
                    <Badge variant={st === "ativa" ? "default" : "outline"}>{st}</Badge>
                  </li>
                );
              })}
              {codes.data?.length === 0 && <li className="text-muted-foreground">Nenhuma senha gerada.</li>}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
