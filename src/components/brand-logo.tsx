import logo from "@/assets/vcampro-installer-logo.png.asset.json";

export function BrandLogo({ className = "" }: { className?: string }) {
  return <img src={logo.url} alt="VCAMPRO INSTALLER" width={1536} height={1024} className={`object-contain ${className}`} />;
}