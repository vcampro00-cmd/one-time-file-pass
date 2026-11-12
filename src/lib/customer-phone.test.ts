import { describe, expect, it } from "vitest";
import { isValidCustomerPhone, normalizeCustomerPhone } from "./customer-phone";

describe("customer phone", () => {
  it("keeps digits and a single leading plus", () => {
    expect(normalizeCustomerPhone("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(normalizeCustomerPhone("06.12.34.56.78")).toBe("0612345678");
    expect(normalizeCustomerPhone("(06) 12-34-56-78")).toBe("0612345678");
  });
  it("accepts national and international numbers", () => {
    expect(isValidCustomerPhone("0612345678")).toBe(true);
    expect(isValidCustomerPhone("+33612345678")).toBe(true);
  });
  it("rejects too short, too long or non-numeric values", () => {
    expect(isValidCustomerPhone("1234567")).toBe(false);
    expect(isValidCustomerPhone("1234567890123456")).toBe(false);
    expect(isValidCustomerPhone("abc")).toBe(false);
    expect(isValidCustomerPhone("")).toBe(false);
  });
});
