import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { customerStepsQuery, type CustomerStep } from "@/lib/customer-steps";

const options: { key: CustomerStep; label: string }[] = [
  { key: "dns", label: "1. Profil DNS" },
  { key: "link", label: "3. Lien" },
  { key: "files", label: "4. Fichiers disponibles" },
  { key: "warranty", label: "5. Remplir la garantie" },
];

export function CustomerStepsPanel() {
  const queryClient = useQueryClient();
  const settings = useQuery(customerStepsQuery);
  const [saving, setSaving] = useState(false);

  async function toggle(key: CustomerStep, value: boolean) {
    if (!settings.data) return;
    setSaving(true);
    const next = { ...settings.data, [key]: value };
    try {
      const { data, error } = await supabase.from("customer_steps").upsert({ id: true, ...next }).select("dns, link, files, warranty").single();
      if (error) throw error;
      queryClient.setQueryData(customerStepsQuery.queryKey, data);
      toast.success("Affichage client mis à jour");
    } catch {
      toast.error("Impossible d'enregistrer les étapes");
    } finally {
      setSaving(false);
    }
  }

  return <section className="mx-auto mb-10 max-w-5xl border-y border-border py-6">
    <h2 className="mb-4 text-xl font-bold">Étapes du client</h2>
    <div className="flex items-center justify-between gap-4 border-b border-border py-3">
      <span>2. Certifier l'appareil</span><span className="text-sm text-primary">Toujours actif</span>
    </div>
    {options.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-4 border-b border-border py-3">
      <label htmlFor={`step-${key}`}>{label}</label>
      <Switch id={`step-${key}`} aria-label={label} checked={settings.data?.[key] ?? false} disabled={saving || !settings.data} onCheckedChange={(value) => void toggle(key, value)} />
    </div>)}
    {settings.isError && <p role="alert" className="mt-3 text-sm text-destructive">Impossible de charger les étapes.</p>}
  </section>;
}