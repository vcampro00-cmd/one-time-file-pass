import { describe, expect, it } from "vitest";
import { resolveCustomerSteps } from "./customer-steps";

describe("customer step visibility", () => {
  it("keeps step 1 DNS off by default", () => expect(resolveCustomerSteps(null).dns).toBe(false));
  it("keeps step 3 external link off by default", () => expect(resolveCustomerSteps(null).link).toBe(false));
  it("keeps step 4 file downloads off by default", () => expect(resolveCustomerSteps(null).files).toBe(false));
  it("keeps warranty off so only certification appears by default", () => expect(resolveCustomerSteps(null).warranty).toBe(false));
  it("restores each optional step independently from owner settings", () => {
    expect(resolveCustomerSteps({ dns: true, link: false, files: true, warranty: true })).toEqual({ dns: true, link: false, files: true, warranty: true });
  });
});