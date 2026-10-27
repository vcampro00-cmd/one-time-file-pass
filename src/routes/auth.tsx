import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — VCAMPRO INSTALLER" },
      { name: "description", content: "Acesso do dono para enviar arquivos e gerar senhas." },
      { property: "og:title", content: "Entrar — VCAMPRO INSTALLER" },
      { property: "og:description", content: "Acesso do dono do VCAMPRO INSTALLER." },
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
      if (error) { toast.error("E-mail ou senha incorretos"); return; }
      navigate({ to: "/painel" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/painel" },
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
      setMode("in");
    }
  }

  return (
    <main className="grid-paper flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-5 p-8">
        <h1 className="text-2xl font-bold">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Senha</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {mode === "in" ? "Entrar" : "Criar conta"}
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "in" ? "Primeira vez? Criar conta" : "Já tenho conta"}
        </button>
      </form>
    </main>
  );
}
