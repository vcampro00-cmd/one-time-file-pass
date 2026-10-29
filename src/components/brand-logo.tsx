import logo from "@/assets/vcampro-installer-logo-red.png";

export function BrandLogo({ className = "" }: { className?: string }) {
  return <img src={logo} alt="VCAMPRO INSTALLER" width={1536} height={1024} className={`object-contain ${className}`} />;
}
