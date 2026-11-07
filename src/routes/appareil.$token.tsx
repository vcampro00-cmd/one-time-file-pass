import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDevice } from "@/lib/devices.functions";

export const Route = createFileRoute("/appareil/$token")({
  staticData: { sitemap: false },
  ssr: false,
  component: DevicePage,
});

type Device = Awaited<ReturnType<typeof getDevice>>;

function DevicePage() {
  const { token } = Route.useParams();
  const fetchDevice = useServerFn(getDevice);
  const [d, setD] = useState<Device | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetchDevice({ data: { token } }).then((r) => alive && setD(r)).catch(() => alive && setD(null));
    void load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  if (d === undefined) return <Loader2 className="mx-auto animate-spin" />;
  if (!d) return <p className="text-center text-destructive">Lien invalide.</p>;

  const manifest = `${window.location.origin}/api/public/udid/manifest?t=${token}`;
  return (
    <div className="space-y-4">
      <div className="access-step space-y-3 py-6">
        <h1 className="text-xl font-bold">Appareil enregistré</h1>
        <p className="text-sm text-muted-foreground">{d.product} · iOS {d.iosVersion}</p>
        <p className="break-all font-mono text-sm">{d.udid}</p>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(d.udid); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <Check /> : <Copy />} {copied ? "Copié !" : "Copier l'UDID"}
        </Button>
      </div>
      <div className="access-step space-y-3 py-6">
        <h2 className="text-lg font-bold">Installation</h2>
        {d.ready ? (
          <Button asChild variant="brand" className="h-11 w-full font-mono text-xs font-bold uppercase">
            <a href={`itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`}>
              <Download className="h-4 w-4" /> Installer {d.appName ?? "VCAMPRO"} (1 clic)
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Certification en cours. Gardez cette page : le bouton d'installation apparaîtra ici automatiquement.</p>
        )}
      </div>
    </div>
  );
}
