import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";

export function LicenseShell({ children, owner = false }: { children: ReactNode; owner?: boolean }) {
  const token = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;
  return <main className="min-h-screen bg-background text-foreground">
    {(!token || token.startsWith("pk_test_")) && <div className="border-b border-border bg-secondary px-4 py-3 text-center text-sm text-accent">{token ? "Paiements de test — aucun prélèvement réel." : "Les paiements réels ne sont pas encore configurés."}</div>}
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
      <Link to="/licences" className="flex items-center gap-3"><BrandLogo className="h-16 w-24" /><span className="text-sm font-bold">VCAMPRO INSTALLER<span className="block text-xs font-normal text-muted-foreground">{owner ? "Gestion des licences" : "Licences"}</span></span></Link>
      <Button asChild variant="outline" size="sm"><Link to={owner ? "/licences" : "/gestion-licences"}>{owner ? "Espace client" : "Espace propriétaire"}</Link></Button>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-10">{children}</div>
  </main>;
}