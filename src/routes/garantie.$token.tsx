import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getDevice } from "@/lib/devices.functions";
import { WarrantyForm } from "@/components/warranty-form";

export const Route = createFileRoute("/garantie/$token")({
  staticData: { sitemap: false },
  ssr: false,
  head: () => ({ meta: [
    { title: "Garantie 3 mois — VCAMPRO INSTALLER" },
    { name: "description", content: "Générez votre certificat de garantie VCAMPRO de 3 mois." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Garantie 3 mois — VCAMPRO INSTALLER" },
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
  useEffect(() => { fetchDevice({ data: { token } }).then(setD).catch(() => setD(null)); }, [token]);

  if (d === undefined) return <Loader2 className="mx-auto mt-24 animate-spin" />;
  if (!d || d.cancelled) return <p className="mt-24 text-center text-destructive">Lien invalide.</p>;
  return (
    <main className="grid-paper flex min-h-screen justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        <p className="text-sm text-muted-foreground">Installation lancée. Votre garantie de 3 mois commence aujourd’hui.</p>
        <WarrantyForm serial={d.serial ?? undefined} />
      </div>
    </main>
  );
}
