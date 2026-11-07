import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { BuyCode } from "@/components/buy-code";

export const Route = createFileRoute("/revenda")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Espace revendeur — VCAMPRO INSTALLER" },
      { name: "description", content: "Tarif revendeur pour les codes d’accès VCAMPRO INSTALLER." },
      { property: "og:title", content: "Espace revendeur — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Code d’accès 20 minutes au tarif revendeur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Revenda,
});

function Revenda() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <Link to="/" className="mx-auto"><BrandLogo /></Link>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Espace revendeur</h1>
        <p className="text-sm text-muted-foreground">
          Code d’accès valable 20 minutes à partir de la première saisie sur le site, au tarif revendeur.
        </p>
      </div>
      <BuyCode reseller />
    </main>
  );
}
