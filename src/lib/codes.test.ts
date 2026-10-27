import { describe, expect, it } from "vitest";
import { codeStatus, expiresAtFrom, generateCode, hashCode } from "./codes";

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
