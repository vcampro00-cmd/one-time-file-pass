import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDevice } from "@/lib/devices.functions";

export const Route = createFileRoute("/appareil/$token")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({ meta: [
    { title: "Appareil certifié — VCAMPRO INSTALLER" },
    { name: "description", content: "Confirmation de votre appareil et disponibilité de l'installation VCAMPRO." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Appareil certifié — VCAMPRO INSTALLER" },
    { property: "og:description", content: "Votre installation VCAMPRO sera disponible sur cette page." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DevicePage,
});

type Device = Awaited<ReturnType<typeof getDevice>>;

function DevicePage() {
  const { token } = Route.useParams();
  const fetchDevice = useServerFn(getDevice);
  const navigate = useNavigate();
  const [d, setD] = useState<Device | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const load = () => fetchDevice({ data: { token } }).then((r) => alive && setD(r)).catch(() => alive && setD(null));
    void load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [token]);

  if (d === undefined) return <Loader2 className="mx-auto animate-spin" />;
  if (!d) return <p className="text-center text-destructive">Lien invalide.</p>;
  if (d.cancelled) return <p role="alert" className="text-center text-destructive">Installation annulée. Contactez VCAMPRO INSTALLER.</p>;

  const manifest = `${window.location.origin}/api/public/udid/manifest?t=${token}`;
  return (
    <div className="space-y-4">
      <div className="access-step space-y-3 py-6">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Check className="text-primary" /> Appareil certifié</h1>
      </div>
      <div className="access-step space-y-3 py-6">
        {d.ready && <h2 className="text-lg font-bold">Installation</h2>}
        {d.ready ? (
          <Button asChild variant="brand" className="h-11 w-full font-mono text-xs font-bold uppercase">
            <a onClick={() => setTimeout(() => navigate({ to: "/garantie/$token", params: { token } }), 1500)} href={`itms-services://?action=download-manifest&url=${encodeURIComponent(manifest)}`}>
              <Download className="h-4 w-4" /> Installer {d.appName ?? "VCAMPRO"} (1 clic)
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Veuillez patienter. Votre application apparaîtra ici dès qu'elle sera prête à être installée.</p>
        )}
      </div>
    </div>
  );
}
