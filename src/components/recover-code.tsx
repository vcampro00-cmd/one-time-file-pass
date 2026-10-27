import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCode } from "@/lib/codes";
import { revealPurchasedCode } from "@/lib/payments.functions";
import { clearPurchase, readPurchase } from "@/lib/purchase-store";

type Result = { code: string; expiresAt: string } | { error: string };

// Shows the code bought in this browser again, while it is still valid.
export function RecoverCode() {
  const reveal = useServerFn(revealPurchasedCode);
  const [stored, setStored] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setStored(readPurchase() !== null);
  }, []);

  useEffect(() => {
    if (!res || !("code" in res)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [res]);

  if (!stored) return null;

  async function show() {
    const sessionId = readPurchase();
    if (!sessionId) return;
    setLoading(true);
    setRes(null);
    try {
      const r = await reveal({ data: { sessionId } });
      setRes(r);
      if ("error" in r) clearPurchase();
    } catch {
      setRes({ error: "Impossible de récupérer votre code." });
    } finally {
      setLoading(false);
    }
  }

  const code = res && "code" in res ? res.code : null;
  const expiresAt = res && "code" in res ? res.expiresAt : null;
  const left = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
    : 0;
  const time = left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "expiré";

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused: the code is on screen anyway */
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-6">
      {res && "error" in res ? (
        <p className="text-center text-sm text-muted-foreground">{res.error}</p>
      ) : code ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Votre code</p>
          <p className="font-mono text-3xl tracking-[0.2em] text-accent">{formatCode(code)}</p>
          <p className="text-sm text-muted-foreground">
            Temps restant : <span className="font-mono">{time}</span>
          </p>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={copy}>
            {copied ? <Check /> : null}
            {copied ? "Copié" : "Copier le code"}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={show} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Eye />}
          Afficher mon code
        </Button>
      )}
    </div>
  );
}
