import { describe, expect, it } from "vitest";
import { isValidImei, warrantyEnd } from "./warranty";

describe("warranty", () => {
  it("lasts three months from the day it is filled", () => {
    expect(warrantyEnd(new Date(2026, 10, 3)).toDateString()).toBe(new Date(2027, 1, 3).toDateString());
  });
  it("accepts only valid 15-digit IMEIs", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(isValidImei("490154203237519")).toBe(false);
    expect(isValidImei("12345")).toBe(false);
  });
});
