import { useState } from "react";
import { FileCheck2 } from "lucide-react";
import logo from "@/assets/vcampro-installer-logo-red.png";
import { Button } from "@/components/ui/button";
import { isValidImei, warrantyEnd, WARRANTY_MONTHS } from "@/lib/warranty";

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return { data: c.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight };
}

async function makePdf(name: string, imei: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const red: [number, number, number] = [200, 20, 30];
  const start = new Date();
  const end = warrantyEnd(start);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const no = `VC-G-${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, "0")}${String(start.getDate()).padStart(2, "0")}-${imei.slice(-6)}`;

  doc.setFillColor(12, 12, 14); doc.rect(0, 0, 210, 48, "F");
  doc.setFillColor(...red); doc.rect(0, 48, 210, 1.5, "F");
  const l = await loadImage(logo);
  doc.addImage(l.data, "PNG", 14, 6, 54, (54 * l.h) / l.w);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
  doc.text("CERTIFICAT DE GARANTIE", 196, 24, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(200, 200, 200);
  doc.text(`N° ${no}`, 196, 32, { align: "right" });
  doc.text("vcamproinstaller.com", 196, 38, { align: "right" });

  doc.setTextColor(20, 20, 20);
  let y = 66;
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...red);
    doc.text(label.toUpperCase(), 20, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.setTextColor(20, 20, 20);
    doc.text(value, 20, y + 7);
    doc.setDrawColor(220, 220, 220); doc.line(20, y + 11, 190, y + 11);
    y += 20;
  };
  row("Nom du client", name);
  row("Numéro IMEI", imei);
  row("Date de la garantie", fmt(start));
  row(`Validité (${WARRANTY_MONTHS} mois)`, `Jusqu’au ${fmt(end)}`);

  y += 4;
  doc.setFillColor(248, 240, 240); doc.setDrawColor(...red); doc.roundedRect(20, y, 170, 52, 2, 2, "FD");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...red);
  doc.text("Observation", 26, y + 9);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
  doc.text(doc.splitTextToSize(
    "La garantie couvre uniquement la programmation. Si la programmation cesse de fonctionner pendant la période de validité, VCAMPRO INSTALLER s’engage à la refaire gratuitement, sur présentation de ce certificat PDF. La reprise gratuite n’est effectuée que sur présentation de ce PDF et si le numéro IMEI de l’appareil correspond à celui indiqué ci-dessus.",
    158), 26, y + 17);

  // Stamp
  const cx = 150, cy = 245;
  doc.setDrawColor(...red); doc.setTextColor(...red);
  doc.setLineWidth(1.2); doc.circle(cx, cy, 22);
  doc.setLineWidth(0.5); doc.circle(cx, cy, 18.5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("VCAMPRO", cx, cy - 2, { align: "center" });
  doc.setFontSize(8); doc.text("INSTALLER", cx, cy + 4, { align: "center" });
  doc.setFontSize(6); doc.text("GARANTIE CERTIFIÉE", cx, cy + 10, { align: "center" });
  doc.text("★ ★ ★", cx, cy - 9, { align: "center" });
  doc.setFont("times", "italic"); doc.setFontSize(16); doc.setTextColor(30, 30, 30);
  doc.text("VCAMPRO Installer", 30, 245);
  doc.setLineWidth(0.3); doc.setDrawColor(60, 60, 60); doc.line(25, 249, 100, 249);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text("Signature autorisée — VCAMPRO INSTALLER", 25, 254);
  doc.text(`Émis le ${fmt(start)} · Document à conserver`, 105, 285, { align: "center" });

  doc.save(`Garantie-VCAMPRO-${imei}.pdf`);
}

export function WarrantyForm() {
  const [name, setName] = useState("");
  const [imei, setImei] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const i = imei.replace(/\s/g, "");
    if (n.length < 2 || n.length > 80) return setError("Indiquez votre nom complet.");
    if (!isValidImei(i)) return setError("Numéro IMEI invalide (15 chiffres, *#06#).");
    setError(null); setBusy(true);
    try { await makePdf(n, i); } finally { setBusy(false); }
  }

  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <form onSubmit={submit} className="access-step space-y-3 py-6">
      <h2 className="text-lg font-bold">4. Remplir la garantie</h2>
      <p className="text-sm text-muted-foreground">Garantie de {WARRANTY_MONTHS} mois à partir d’aujourd’hui. Conservez le PDF.</p>
      <input className={input} placeholder="Nom complet" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Nom complet" />
      <input className={`${input} font-mono`} placeholder="IMEI (composez *#06#)" inputMode="numeric" value={imei} maxLength={17} onChange={(e) => setImei(e.target.value.replace(/[^\d ]/g, ""))} aria-label="Numéro IMEI" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="brand" disabled={busy} className="h-11 w-full font-mono text-xs font-bold uppercase">
        <FileCheck2 className="h-4 w-4" /> Générer le certificat PDF
      </Button>
    </form>
  );
}
