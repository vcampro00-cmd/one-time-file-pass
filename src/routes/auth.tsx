import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, follow" },
      { title: "Connexion — VCAMPRO INSTALLER" },
      { name: "description", content: "Accès propriétaire pour importer des fichiers et générer des codes à usage unique." },
      { property: "og:title", content: "Connexion — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Espace propriétaire de VCAMPRO INSTALLER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error("Adresse e-mail ou mot de passe incorrect"); return; }
      navigate({ to: "/painel" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/painel" },
      });
      setLoading(false);
      if (error) { toast.error("Impossible de créer le compte. Vérifiez vos informations et réessayez."); return; }
      toast.success("Compte créé ! Confirmez votre adresse avec le lien reçu par e-mail.");
      setMode("in");
    }
  }

  return (
    <main className="grid-paper flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-5 p-8">
        <BrandLogo className="mx-auto h-36 w-56 max-w-full" />
        <h1 className="text-2xl font-bold">{mode === "in" ? "Se connecter" : "Créer un compte"}</h1>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Mot de passe</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {mode === "in" ? "Se connecter" : "Créer un compte"}
        </Button>
      </form>
    </main>
  );
}
