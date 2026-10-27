import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { redeemAccessCode } from "@/lib/codes.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VCAMPRO INSTALLER — Téléchargez vos fichiers avec un code" },
      { name: "description", content: "Saisissez votre code à usage unique pour télécharger les fichiers partagés avec vous." },
      { property: "og:title", content: "VCAMPRO INSTALLER — Téléchargez vos fichiers avec un code" },
      { property: "og:description", content: "Codes à usage unique valables pendant 10 minutes." },
      { property: "og:site_name", content: "VCAMPRO INSTALLER" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function formatSize(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  return `${(n / 1024 ** 3).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Go`;
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
      if (!res.ok) setError("Code invalide, déjà utilisé ou expiré.");
      else setFiles(res.files);
    } catch {
      setError("Code invalide, déjà utilisé ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid-paper flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo className="h-20 w-32 shrink-0 sm:h-24 sm:w-36" />
        <Link to="/painel" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Espace propriétaire →
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="panel w-full max-w-md p-8">
          {!files ? (
            <form onSubmit={submit} className="space-y-6">
              <div className="space-y-2">
                <KeyRound className="h-8 w-8 text-accent" />
                <h1 className="text-3xl font-bold tracking-tight">Saisissez votre code</h1>
                <p className="text-sm text-muted-foreground">
                  Chaque code ne peut être utilisé qu’une seule fois et expire après 10 minutes.
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
                {loading ? <Loader2 className="animate-spin" /> : "Déverrouiller"}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Fichiers disponibles</h1>
                <p className="text-sm text-muted-foreground">
                  Le code a été utilisé. Téléchargez maintenant : les liens sont valables pendant 10 minutes.
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
                        <Download /> Télécharger
                      </a>
                    </Button>
                  </li>
                ))}
                {files.length === 0 && <li className="py-3 text-sm text-muted-foreground">Aucun fichier disponible.</li>}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
