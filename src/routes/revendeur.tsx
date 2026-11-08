import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, LogIn, LogOut, Plus, ShoppingCart, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand-logo";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { claimResellerCredits, createResellerCreditCheckout, MAX_CREDITS_PER_PURCHASE, createResellerLink, getResellerPanel, resellerLogin, resellerLogout } from "@/lib/resellers.functions";
import { isLinkUsable } from "@/lib/resellers";

export const Route = createFileRoute("/revendeur")({
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

const SESSION_KEY = "vcampro-reseller-session";

function ResellerPanel() {
  const [session, setSession] = useState<string | null | undefined>(undefined);
  useEffect(() => { setSession(localStorage.getItem(SESSION_KEY)); }, []);
  if (session === undefined) return <main className="p-10 text-center text-muted-foreground">Chargement…</main>;
  if (!session) return <Login onLogin={(s) => { localStorage.setItem(SESSION_KEY, s); setSession(s); }} />;
  return <Panel session={session} onLogout={() => { localStorage.removeItem(SESSION_KEY); setSession(null); }} />;
}

function Login({ onLogin }: { onLogin: (s: string) => void }) {
  const login = useServerFn(resellerLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await login({ data: { username, password } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    onLogin(res.session);
  }
  return (
    <main className="mx-auto max-w-sm space-y-6 px-4 py-10">
      <BrandLogo />
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-5">
        <h1 className="text-xl font-bold">Espace revendeur</h1>
        <Input autoComplete="username" autoCapitalize="none" placeholder="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input type="password" autoComplete="current-password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" variant="brand" className="w-full" disabled={busy || !username || !password}><LogIn /> {busy ? "Connexion…" : "Se connecter"}</Button>
      </form>
    </main>
  );
}

function Panel({ session, onLogout }: { session: string; onLogout: () => void }) {
  const key = session;
  const logout = useServerFn(resellerLogout);
  const qc = useQueryClient();
  const load = useServerFn(getResellerPanel);
  const create = useServerFn(createResellerLink);
  const panel = useQuery({ queryKey: ["reseller", key], queryFn: () => load({ data: { session: key } }), refetchInterval: 15000 });
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
    const res = await create({ data: { session: key, label } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    setCurrent(res.token);
    setLabel("");
    qc.invalidateQueries({ queryKey: ["reseller", key] });
  }

  const claim = useServerFn(claimResellerCredits);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("credits_session");
    if (!id) return;
    window.history.replaceState(null, "", "/revendeur");
    claim({ data: { session: key, checkoutId: id, environment: getStripeEnvironment() } }).then((r) => {
      if (!r.ok) toast.error(r.error);
      else if (r.added > 0) toast.success(`${r.added} crédit${r.added > 1 ? "s" : ""} ajouté${r.added > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["reseller", key] });
    });
  }, []);

  if (panel.isLoading) return <main className="p-10 text-center text-muted-foreground">Chargement…</main>;
  const p = panel.data;
  if (!p) return <main className="space-y-4 p-10 text-center"><p>Session expirée ou compte désactivé.</p><Button variant="brand" onClick={onLogout}><LogIn /> Se reconnecter</Button></main>;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <BrandLogo />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Espace revendeur</p>
          <h1 className="text-2xl font-bold">{p.name}</h1>
        </div>
        <Button size="sm" variant="ghost" onClick={async () => { await logout({ data: { session } }).catch(() => {}); onLogout(); }}><LogOut /> Déconnexion</Button>
        <div className="rounded-md border border-primary/40 px-4 py-2 text-center">
          <p className="font-mono text-3xl font-bold text-primary">{p.credits}</p>
          <p className="text-xs text-muted-foreground">crédit{p.credits > 1 ? "s" : ""}</p>
        </div>
      </header>

      <BuyCredits session={key} />

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

function BuyCredits({ session }: { session: string }) {
  const [qty, setQty] = useState(5);
  const [open, setOpen] = useState(false);
  const start = useServerFn(createResellerCreditCheckout);
  const fetchClientSecret = async () => {
    const r = await start({ data: { session, quantity: qty, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/revendeur?credits_session={CHECKOUT_SESSION_ID}` } });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  };
  return (
    <section className="space-y-3 rounded-lg border border-border p-5">
      <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="size-5" /> Acheter des crédits</h2>
      <p className="text-sm text-muted-foreground">50 € par crédit. Les crédits sont ajoutés dès le paiement confirmé.</p>
      <div className="flex gap-2">
        <Input type="number" min={1} max={MAX_CREDITS_PER_PURCHASE} aria-label="Nombre de crédits" className="w-24" value={qty} onChange={(e) => setQty(Math.min(MAX_CREDITS_PER_PURCHASE, Math.max(1, Number(e.target.value) || 1)))} />
        <Button variant="brand" className="flex-1" onClick={() => setOpen(true)}><ShoppingCart /> Acheter {qty} crédit{qty > 1 ? "s" : ""} — {qty * 50} €</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{qty} crédit{qty > 1 ? "s" : ""} — {qty * 50} €</DialogTitle></DialogHeader>
          {open && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
