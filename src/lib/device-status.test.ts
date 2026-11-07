import { describe, expect, it } from "vitest";
import { canInstallDevice, deviceStatus } from "./device-status";
describe("device categories", () => {
  it("classifies published devices as certified", () => expect(deviceStatus({ ready_at: "2026-11-07", cancelled_at: null })).toBe("certified"));
  it("classifies unpublished devices as pending", () => expect(deviceStatus({ ready_at: null, cancelled_at: null })).toBe("pending"));
  it("classifies cancelled devices separately even if published", () => expect(deviceStatus({ ready_at: "2026-11-07", cancelled_at: "2026-11-08" })).toBe("cancelled"));
  it("blocks installation when cancelled", () => expect(canInstallDevice({ ready_at: "2026-11-07", cancelled_at: "2026-11-08", ipa_path: "signed.ipa" })).toBe(false));
  it("restores installation when cancellation is removed", () => expect(canInstallDevice({ ready_at: "2026-11-07", cancelled_at: null, ipa_path: "signed.ipa" })).toBe(true));
});