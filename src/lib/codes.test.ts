import { describe, expect, it } from "vitest";
import {
  codeStatus,
  expiresAtFrom,
  formatCode,
  generateCode,
  hashCode,
  isCodeComplete,
  isMasterCode,
  maskCode,
} from "./codes";

describe("one-time passwords", () => {
  it("expire 10 minutes after creation", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(expiresAtFrom(now).toISOString()).toBe("2026-01-01T12:10:00.000Z");
  });

  it("cannot be reused once used, even before expiry", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(codeStatus({ expires_at: future, used_at: new Date().toISOString() })).toBe("usada");
  });

  it("are rejected after expiry", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(codeStatus({ expires_at: past, used_at: null })).toBe("expirada");
  });

  it("hash the same regardless of dash or case", async () => {
    const c = generateCode();
    expect(await hashCode(`${c.slice(0, 4).toLowerCase()}-${c.slice(4)}`)).toBe(await hashCode(c));
  });
});

describe("owner test code", () => {
  it("is 170-214 and works with or without the dash", () => {
    expect(isMasterCode("170-214")).toBe(true);
    expect(isMasterCode("170214")).toBe(true);
    expect(isMasterCode("170-215")).toBe(false);
  });

  it("is formatted with its own dash", () => {
    expect(formatCode("170214")).toBe("170-214");
  });
});

describe("typing the code", () => {
  it("adds the middle dash automatically for random codes", () => {
    expect(maskCode("abcd")).toBe("ABCD");
    expect(maskCode("abcd1")).toBe("ABCD-1");
    expect(maskCode("abcd1234")).toBe("ABCD-1234");
    expect(maskCode("ABCD-1234")).toBe("ABCD-1234");
  });

  it("keeps the test code's own dash position", () => {
    expect(maskCode("170-214")).toBe("170-214");
    expect(maskCode("170-2")).toBe("170-2");
  });

  it("accepts 6 and 8 characters, nothing shorter", () => {
    expect(isCodeComplete("170-214")).toBe(true);
    expect(isCodeComplete("ABCD-1234")).toBe(true);
    expect(isCodeComplete("ABC-12")).toBe(false);
  });
});
