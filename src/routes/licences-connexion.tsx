import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { licenseHead } from "@/lib/licenses";
import { LicenseShell } from "@/components/license-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/licences-connexion")({
  staticData: { sitemap: false },
  head: () => licenseHead("Connexion licences", "Connexion du propriétaire au panneau de gestion des licences VCAMPRO."),
  component: LicenseLogin,
});
function LicenseLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("Adresse e-mail ou mot de passe incorrect."); return; }
      await navigate({ to: "/gestion-licences" });
    } finally { setBusy(false); }
  }
  return <LicenseShell><form onSubmit={submit} className="mx-auto max-w-sm space-y-5 py-10"><h1 className="mb-8 text-2xl font-bold">Connexion propriétaire</h1><Label htmlFor="license-email">E-mail</Label><Input id="license-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /><Label htmlFor="license-password">Mot de passe</Label><Input id="license-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><Button type="submit" className="w-full" disabled={busy}>{busy ? "Connexion…" : "Gestion des licences"}</Button></form></LicenseShell>;
}