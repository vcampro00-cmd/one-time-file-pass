// UDID capture (Apple "Profile Service") and one-click install manifest helpers. Web-only APIs (Worker safe).

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildUdidProfile(callbackUrl: string, uuid: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key><string>${esc(callbackUrl)}</string>
    <key>DeviceAttributes</key>
    <array><string>UDID</string><string>PRODUCT</string><string>VERSION</string><string>SERIAL</string></array>
  </dict>
  <key>PayloadOrganization</key><string>VCAMPRO INSTALLER</string>
  <key>PayloadDisplayName</key><string>VCAMPRO INSTALLER — Certification</string>
  <key>PayloadDescription</key><string>Envoie l'identifiant de l'appareil (UDID) à VCAMPRO INSTALLER pour la certification.</string>
  <key>PayloadIdentifier</key><string>com.vcamproinstaller.udid</string>
  <key>PayloadUUID</key><string>${uuid}</string>
  <key>PayloadType</key><string>Profile Service</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>`;
}

/** iOS posts a CMS-signed blob containing a plain XML plist; read the keys from it. */
export function parseDeviceAttributes(body: Uint8Array): Record<string, string> | null {
  let text = "";
  for (const b of body) text += String.fromCharCode(b);
  const start = text.indexOf("<?xml");
  const end = text.indexOf("</plist>");
  if (start < 0 || end < 0) return null;
  const xml = text.slice(start, end);
  const out: Record<string, string> = {};
  const re = /<key>([^<]+)<\/key>\s*<string>([^<]*)<\/string>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out[m[1]!] = m[2]!;
  return out["UDID"] && /^[0-9A-Fa-f-]{24,40}$/.test(out["UDID"]) ? out : null;
}

export function buildManifest(o: { ipaUrl: string; bundleId: string; version: string; title: string; iconUrl: string }): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array><dict>
    <key>assets</key>
    <array>
      <dict><key>kind</key><string>software-package</string><key>url</key><string>${esc(o.ipaUrl)}</string></dict>
      <dict><key>kind</key><string>display-image</string><key>url</key><string>${esc(o.iconUrl)}</string></dict>
      <dict><key>kind</key><string>full-size-image</string><key>url</key><string>${esc(o.iconUrl)}</string></dict>
    </array>
    <key>metadata</key>
    <dict>
      <key>bundle-identifier</key><string>${esc(o.bundleId)}</string>
      <key>bundle-version</key><string>${esc(o.version)}</string>
      <key>kind</key><string>software</string>
      <key>title</key><string>${esc(o.title)}</string>
    </dict>
  </dict></array>
</dict>
</plist>`;
}

export function newDeviceToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export const httpsOrigin = (url: string) => new URL(url).origin.replace(/^http:\/\/(?!localhost)/, "https://");
