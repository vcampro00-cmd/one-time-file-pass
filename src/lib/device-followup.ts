import { canInstallDevice, type DeviceState } from "./device-status";

export function canDownloadFollowup(device: DeviceState & { ipa_path: string | null }, model: string | null): boolean {
  return model === "8" && !!device.installed_at && canInstallDevice(device);
}

export function isFollowupFile(model: string): boolean {
  return model === "8" || model === "all";
}