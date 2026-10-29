import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { redeemAccessCode } from "@/lib/codes.functions";
import { isCodeComplete, maskCode } from "@/lib/codes";
import { BuyCode } from "@/components/buy-code";
import { RecoverCode } from "@/components/recover-code";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
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

const SESSION_KEY = "vcampro:session";

function Index() {
  const redeem = useServerFn(redeemAccessCode);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileLink[] | null>(null);
  const [profileHref, setProfileHref] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  function endSession(message: string | null) {
    sessionStorage.removeItem(SESSION_KEY);
    setFiles(null);
    setProfileHref(null);
    setExpiresAt(null);
    setCode("");
    setError(message);
  }

  async function open(c: string, restoring = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await redeem({ data: { code: c } });
      if (!res.ok) {
        if (restoring) sessionStorage.removeItem(SESSION_KEY);
        setError(restoring ? "Session expirée. Le code n’est plus valide." : "Code invalide ou expiré.");
      } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code: c, expiresAt: res.expiresAt }));
        setFiles(res.files);
        setProfileHref(res.profileUrl);
        setExpiresAt(res.expiresAt);
        setNow(Date.now());
      }
    } catch {
      setError("Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await open(code);
  }

  // Keep the session across reloads until the code's 10 minutes are over.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { code: string; expiresAt: string | null };
      if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      void open(s.code, true);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!files) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [files]);

  useEffect(() => {
    if (files && expiresAt && now >= new Date(expiresAt).getTime()) {
      endSession("Session expirée. Le code n’est plus valide.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, files, expiresAt]);

  let left = "";
  if (expiresAt) {
    const s = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    left = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <main className="grid-paper flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo className="h-14 w-24 shrink-0 sm:h-16 sm:w-28" />
        <Link to="/painel" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          Espace propriétaire →
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 pb-16">
        {!files ? (
          <form onSubmit={submit} className="flex w-full max-w-sm flex-col items-center">
            {/* The code entry is the padlock itself, in the logo's colors. */}
            <div className="relative">
              <svg
                aria-hidden
                viewBox="0 0 100 92"
                className="absolute -top-[4.6rem] left-1/2 z-0 w-28 -translate-x-[42%] -rotate-[18deg] sm:w-32"
                fill="none"
              >
                <defs>
                  <linearGradient id="shackleGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="var(--lock-cyan)" />
                    <stop offset="0.55" stopColor="var(--lock-blue)" />
                    <stop offset="1" stopColor="var(--lock-purple)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 21 92 L 21 44 A 29 29 0 0 1 79 44 L 79 92"
                  stroke="url(#shackleGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
              </svg>
              <div className="lock-body relative z-10 flex w-64 flex-col items-center gap-4 rounded-[2.75rem] px-7 pb-7 pt-12 sm:w-72 sm:rounded-[3.25rem]">
                <div aria-hidden className="pointer-events-none absolute inset-x-8 top-2 h-8 rounded-full bg-foreground/10 blur-md" />
                <Upload className="h-8 w-8 text-accent" strokeWidth={2.5} />
                <input
                  value={code}
                  onChange={(e) => setCode(maskCode(e.target.value))}
                  placeholder="XXXX-XXXX"
                  autoFocus
                  maxLength={9}
                  aria-label="Code d'accès"
                  className="w-full bg-transparent text-center font-mono text-2xl uppercase tracking-[0.25em] text-foreground outline-none placeholder:text-muted-foreground/60"
                />
                <p className="min-h-5 text-center text-sm font-medium text-destructive">{error}</p>
                <button
                  type="submit"
                  disabled={loading || !isCodeComplete(code)}
                  className="btn-gradient flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold uppercase tracking-wider transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Déverrouiller"}
                </button>
              </div>
            </div>

            {/* Wordmark, as on the logo. */}
            <div className="mt-7 text-center">
              <h1 className="wordmark-gradient text-5xl font-black italic tracking-tight sm:text-6xl">
                VCAMPRO
              </h1>
              <div className="wordmark-pill mt-3 inline-flex items-center gap-3 rounded-full px-5 py-1.5">
                <span aria-hidden className="wordmark-dash-left h-0.5 w-7 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-[0.4em]">Installer</span>
                <span aria-hidden className="wordmark-dash-right h-0.5 w-7 rounded-full" />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Chaque code reste valable 10 minutes, puis expire définitivement.
              </p>
            </div>

            <div className="mt-6 flex w-64 max-w-full flex-col items-stretch gap-2">
              <BuyCode />
              <RecoverCode />
            </div>
          </form>
        ) : (
          <div className="w-full max-w-md space-y-4">
            {left && (
              <p className="text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Session active · temps restant <span className="text-accent">{left}</span>
              </p>
            )}

            {/* Step 1: DNS profile, step by step */}
            <div className="panel space-y-3 p-6">
              <h2 className="text-lg font-bold">1. Profil DNS</h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Ouvrez cette page dans Safari sur votre iPhone.</li>
                <li>Appuyez sur « Installer le profil DNS » puis sur « Autoriser ».</li>
                <li>Ouvrez Réglages › Profil téléchargé › Installer.</li>
              </ol>
              {profileHref ? (
                <a
                  href={profileHref}
                  className="btn-gradient flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold uppercase tracking-wider transition hover:brightness-110"
                >
                  <ShieldCheck className="h-4 w-4" /> Installer le profil DNS
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Profil indisponible pour le moment.</p>
              )}
            </div>

            {/* Step 2: link */}
            <div className="panel space-y-3 p-6">
              <h2 className="text-lg font-bold">2. Lien</h2>
              <p className="text-sm text-muted-foreground">Appuyez sur le lien ci-dessous.</p>
              <a
                href="https://khoindvn.io.vn/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 break-all rounded-full border border-border px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-foreground/5"
              >
                <ExternalLink className="h-4 w-4 shrink-0" /> https://khoindvn.io.vn/
              </a>
            </div>

            {/* Step 3: files */}
            <div className="panel space-y-3 p-6">
              <h2 className="text-lg font-bold">3. Fichiers disponibles</h2>
              <p className="text-sm text-muted-foreground">
                Votre code reste valable pendant toute la durée de la session (10 minutes), puis il expire.
              </p>
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

          </div>
        )}
      </section>
    </main>
  );
}
