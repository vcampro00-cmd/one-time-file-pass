export type DeviceState = { ready_at: string | null; cancelled_at: string | null };
export type DeviceStatus = "certified" | "pending" | "cancelled";
export function deviceStatus(device: DeviceState): DeviceStatus {
  if (device.cancelled_at) return "cancelled";
  return device.ready_at ? "certified" : "pending";
}
export function canInstallDevice(device: DeviceState & { ipa_path: string | null }): boolean {
  return deviceStatus(device) === "certified" && !!device.ipa_path;
}