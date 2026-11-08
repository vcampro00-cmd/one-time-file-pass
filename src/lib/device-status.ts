export type DeviceState = { ready_at: string | null; cancelled_at: string | null; installed_at?: string | null };
export type DeviceStatus = "installed" | "certified" | "pending" | "cancelled";
export function deviceStatus(device: DeviceState): DeviceStatus {
  if (device.cancelled_at) return "cancelled";
  if (!device.ready_at) return "pending";
  return device.installed_at ? "installed" : "certified";
}
export function canInstallDevice(device: DeviceState & { ipa_path: string | null }): boolean {
  const s = deviceStatus(device);
  return (s === "certified" || s === "installed") && !!device.ipa_path;
}
