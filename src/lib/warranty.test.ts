import { describe, expect, it } from "vitest";
import { isValidImei, resellerWarrantyEnd, warrantyEnd } from "./warranty";

describe("warranty", () => {
  it("lasts three months from the day it is filled", () => {
    expect(warrantyEnd(new Date(2026, 10, 3)).toDateString()).toBe(new Date(2027, 1, 3).toDateString());
  });
  it("ends five months after reseller device certification", () => {
    expect(resellerWarrantyEnd("2026-11-08T15:17:00Z")?.toISOString()).toBe("2027-04-08T15:17:00.000Z");
  });
  it("does not start reseller warranty before certification", () => {
    expect(resellerWarrantyEnd(null)).toBeNull();
  });
  it("accepts only valid 15-digit IMEIs", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(isValidImei("490154203237519")).toBe(false);
    expect(isValidImei("12345")).toBe(false);
  });
});
