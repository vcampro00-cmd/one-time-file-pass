import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemAccessCode } from "@/lib/codes.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cofre — Baixe arquivos com senha" },
      { name: "description", content: "Digite sua senha de uso único para baixar os arquivos compartilhados com você." },
      { property: "og:title", content: "Cofre — Baixe arquivos com senha" },
      { property: "og:description", content: "Senhas de uso único que expiram em 10 minutos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

type FileLink = { id: string; name: string; size: number; url: string };

function Index() {
  const redeem = useServerFn(redeemAccessCode);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileLink[] | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await redeem({ data: { code } });
      if (!res.ok) setError("Senha inválida, já usada ou expirada.");
      else setFiles(res.files);
    } catch {
      setError("Senha inválida, já usada ou expirada.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid-paper flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="font-mono text-sm font-bold tracking-widest">COFRE/</span>
        <Link to="/painel" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Área do dono →
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="panel w-full max-w-md p-8">
          {!files ? (
            <form onSubmit={submit} className="space-y-6">
              <div className="space-y-2">
                <KeyRound className="h-8 w-8 text-accent" />
                <h1 className="text-3xl font-bold tracking-tight">Digite sua senha</h1>
                <p className="text-sm text-muted-foreground">
                  Cada senha funciona uma única vez e expira em 10 minutos.
                </p>
              </div>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                autoFocus
                maxLength={9}
                className="h-14 text-center font-mono text-2xl tracking-[0.3em]"
              />
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading || code.length < 8}>
                {loading ? <Loader2 className="animate-spin" /> : "Desbloquear"}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Arquivos liberados</h1>
                <p className="text-sm text-muted-foreground">
                  A senha já foi consumida. Baixe agora — os links valem por 10 minutos.
                </p>
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{f.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{formatSize(f.size)}</p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href={f.url} download={f.name}>
                        <Download /> Baixar
                      </a>
                    </Button>
                  </li>
                ))}
                {files.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nenhum arquivo disponível.</li>}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
