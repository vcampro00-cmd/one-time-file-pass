import { unzip } from "fflate";

export type IpaInfo = { bundleId: string; version: string; name?: string | undefined };

const INFO_RE = /^Payload\/[^/]+\.app\/Info\.plist$/;

// Reads bundle id / version from the IPA's main Info.plist (XML or binary).
export async function readIpaInfo(file: File): Promise<IpaInfo> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = await new Promise<Record<string, Uint8Array>>((res, rej) =>
    unzip(buf, { filter: (f) => INFO_RE.test(f.name) }, (e, d) => (e ? rej(e) : res(d))),
  );
  const data = Object.values(entries)[0];
  if (!data) throw new Error("Info.plist introuvable");
  const dict = parsePlist(data);
  const bundleId = dict["CFBundleIdentifier"];
  if (!bundleId) throw new Error("Bundle ID introuvable");
  return {
    bundleId,
    version: dict["CFBundleShortVersionString"] || dict["CFBundleVersion"] || "1.0",
    name: dict["CFBundleDisplayName"] || dict["CFBundleName"],
  };
}

export function parsePlist(data: Uint8Array): Record<string, string> {
  const head = new TextDecoder().decode(data.slice(0, 8));
  return head === "bplist00" ? parseBinary(data) : parseXml(new TextDecoder().decode(data));
}

function parseXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<key>([^<]+)<\/key>\s*<string>([^<]*)<\/string>/g;
  let m;
  while ((m = re.exec(xml))) { const k = m[1]!; if (!(k in out)) out[k] = m[2] ?? ""; }
  return out;
}

function parseBinary(raw: Uint8Array): Record<string, string> {
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const t = b.length - 32;
  const offSize = raw[t + 6]!, refSize = raw[t + 7]!;
  const numObj = Number(dv.getBigUint64(t + 8)), top = Number(dv.getBigUint64(t + 16));
  const tableOff = Number(dv.getBigUint64(t + 24));
  const uint = (p: number, n: number) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + raw[p + i]!; return v; };
  const offset = (i: number) => uint(tableOff + i * offSize, offSize);
  const len = (p: number): [number, number] => {
    const low = raw[p]! & 0xf;
    if (low !== 0xf) return [low, p + 1];
    const n = 1 << (raw[p + 1]! & 0xf);
    return [uint(p + 2, n), p + 2 + n];
  };
  const str = (i: number): string | null => {
    if (i >= numObj) return null;
    const p = offset(i), type = raw[p]! >> 4;
    const [n, s] = len(p);
    if (type === 5) return String.fromCharCode(...raw.slice(s, s + n));
    if (type === 6) { let r = ""; for (let k = 0; k < n; k++) r += String.fromCharCode(dv.getUint16(s + k * 2)); return r; }
    return null;
  };
  const p = offset(top);
  if (raw[p]! >> 4 !== 0xd) throw new Error("plist invalide");
  const [n, s] = len(p);
  const out: Record<string, string> = {};
  for (let k = 0; k < n; k++) {
    const key = str(uint(s + k * refSize, refSize));
    const val = str(uint(s + (n + k) * refSize, refSize));
    if (key && val !== null) out[key] = val;
  }
  return out;
}
