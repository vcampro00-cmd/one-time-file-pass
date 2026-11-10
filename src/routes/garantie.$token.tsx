import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { getDevice } from "@/lib/devices.functions";
import { WarrantyForm } from "@/components/warranty-form";
import { RESELLER_WARRANTY_MONTHS, WARRANTY_MONTHS } from "@/lib/warranty";

export const Route = createFileRoute("/garantie/$token")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({ meta: [
    { title: "Applications et garantie — VCAMPRO INSTALLER" },
    { name: "description", content: "Téléchargez vos applications après installation et obtenez votre garantie VCAMPRO." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Applications et garantie — VCAMPRO INSTALLER" },
    { property: "og:description", content: "Certificat de garantie de la programmation VCAMPRO." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WarrantyPage,
});

function WarrantyPage() {
  const { token } = Route.useParams();
  const fetchDevice = useServerFn(getDevice);
  const [d, setD] = useState<Awaited<ReturnType<typeof getDevice>> | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => fetchDevice({ data: { token } }).then((r) => { if (alive) setD(r); }).catch(() => { if (alive) setD(null); });
    void load();
    const timer = setInterval(load, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [token, fetchDevice]);

  if (d === undefined) return <Loader2 className="mx-auto mt-24 animate-spin" />;
  if (!d || d.cancelled) return <p className="mt-24 text-center text-destructive">Lien invalide.</p>;
  return (
    <main className="grid-paper flex min-h-screen justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        <BrandLogo className="mb-8 h-16 w-28" />
        {d.iphone8 && <section className="access-step space-y-3 py-6">
          <h1 className="text-xl font-bold">Applications iPhone 8</h1>
          {!d.installed ? <p className="text-sm text-muted-foreground">En attente de la confirmation du lancement de l’installation…</p> : <ul className="divide-y divide-border border-y border-border">
            {d.files.map((f) => <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="min-w-0 break-words font-medium">{f.name}</p>
              <Button asChild size="sm" variant="outline"><a href={f.url} download={f.name}><Download /> Télécharger</a></Button>
            </li>)}
            {d.files.length === 0 && <li className="py-4 text-sm text-muted-foreground">Aucune application disponible pour le moment.</li>}
          </ul>}
        </section>}
        <p className="text-sm text-muted-foreground">Installation lancée. Votre garantie de 3 mois commence aujourd’hui.</p>
        <WarrantyForm serial={d.serial} months={d.reseller ? RESELLER_WARRANTY_MONTHS : WARRANTY_MONTHS} />
      </div>
    </main>
  );
}
