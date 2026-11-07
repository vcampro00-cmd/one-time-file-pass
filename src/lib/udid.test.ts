import { describe, expect, it } from "vitest";
import { parseDeviceAttributes } from "./udid";

const enc = (s: string) => new TextEncoder().encode(s);

describe("parseDeviceAttributes", () => {
  it("reads the UDID from the signed blob iOS sends", () => {
    const body = enc("\x30\x80junk<?xml version=\"1.0\"?><plist><dict><key>PRODUCT</key><string>iPhone9,3</string><key>UDID</key><string>00008030-001A2B3C4D5E802E</string></dict></plist>junk");
    const r = parseDeviceAttributes(body);
    expect(r?.["UDID"]).toBe("00008030-001A2B3C4D5E802E");
    expect(r?.["PRODUCT"]).toBe("iPhone9,3");
  });
  it("rejects a body without a UDID", () => {
    expect(parseDeviceAttributes(enc("<?xml?><plist><dict></dict></plist>"))).toBeNull();
  });
});
