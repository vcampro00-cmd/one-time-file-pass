import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/appareil")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Certifier l'appareil — VCAMPRO INSTALLER" },
      { name: "description", content: "Envoyez l'identifiant de votre iPhone pour recevoir l'installation VCAMPRO en un clic." },
      { property: "og:title", content: "Certifier l'appareil — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Certification de l'iPhone et installation en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Appareil,
});

function Appareil() {
  const child = useMatch({ from: "/appareil/$token", shouldThrow: false });
  return (
    <main className="grid-paper access-workspace flex min-h-screen flex-col">
      <header className="cyber-header flex items-center px-4 py-3 sm:px-8">
        <Link to="/"><BrandLogo className="h-14 w-24 sm:h-16 sm:w-28" /></Link>
      </header>
      <section className="mx-auto w-full max-w-md px-4 py-12">
        {child ? <Outlet /> : (
          <div className="access-step space-y-4 py-6">
            <h1 className="text-2xl font-bold">Certifier l'appareil</h1>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Ouvrez cette page dans Safari sur l'iPhone à certifier.</li>
              <li>Appuyez sur le bouton ci-dessous puis sur « Autoriser ».</li>
              <li>Ouvrez Réglages › Profil téléchargé › Installer.</li>
              <li>Vous revenez automatiquement ici avec votre identifiant.</li>
            </ol>
            <Button asChild variant="brand" className="h-11 w-full font-mono text-xs font-bold uppercase">
              <a href="/api/public/udid/profile"><Smartphone className="h-4 w-4" /> Certifier l'appareil</a>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
