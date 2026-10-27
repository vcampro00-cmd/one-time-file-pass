import { describe, expect, it } from "vitest";
import {
  canRevealCode,
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

  it("can be shown again only while unused and not expired", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const future = new Date(now.getTime() + 60_000).toISOString();
    expect(canRevealCode({ expires_at: future, used_at: null }, now)).toBe(true);
    expect(canRevealCode({ expires_at: future, used_at: now.toISOString() }, now)).toBe(false);
    expect(canRevealCode({ expires_at: now.toISOString(), used_at: null }, now)).toBe(false);
  });

  it("hash the same regardless of dash or case", async () => {
    const c = generateCode();
    expect(await hashCode(`${c.slice(0, 4).toLowerCase()}-${c.slice(4)}`)).toBe(await hashCode(c));
  });
});

describe("owner test code", () => {
  it("recognizes the replacement master code with or without the dash", () => {
    expect(isMasterCode("1702-1417")).toBe(true);
    expect(isMasterCode("17021417")).toBe(true);
    expect(isMasterCode("170-214")).toBe(false);
    expect(isMasterCode("1702-1418")).toBe(false);
  });

  it("is formatted with its own dash", () => {
    expect(formatCode("17021417")).toBe("1702-1417");
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
    expect(maskCode("17021417")).toBe("1702-1417");
    expect(maskCode("1702-1417")).toBe("1702-1417");
  });

  it("accepts eight characters and rejects the old six-character code", () => {
    expect(isCodeComplete("1702-1417")).toBe(true);
    expect(isCodeComplete("170-214")).toBe(false);
    expect(isCodeComplete("ABCD-1234")).toBe(true);
    expect(isCodeComplete("ABC-12")).toBe(false);
  });
});
