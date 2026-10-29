#!/usr/bin/env bash
set -euo pipefail
# SDK and output stay outside the checkout. Pass the extracted previous app as template.
ROOT="$(cd "$(dirname "$0")" && pwd)"
: "${SDK:?Set SDK to iPhoneOS16.5.sdk}"
: "${TEMPLATE:?Set TEMPLATE to the extracted VCAMPRO.app directory}"
OUT="${OUT:-/tmp/vcampro-native/build}"
mkdir -p "$OUT/package/var/jb/Applications/VCAMPRO.app" "$OUT/package/DEBIAN"
APP="$OUT/package/var/jb/Applications/VCAMPRO.app"
cp "$TEMPLATE/"*.png "$APP/"
CLANG=$(nix build nixpkgs#clang --no-link --print-out-paths)/bin/clang
"$CLANG" "$ROOT/LicensePolicy.test.c" -o "$OUT/license-policy-test"
"$OUT/license-policy-test"
"$CLANG" -target arm64-apple-ios15.0 -isysroot "$SDK" -fobjc-arc -fblocks -O2 -c "$ROOT/main.m" -o "$OUT/main.o"
ld64.lld -arch arm64 -platform_version ios 15.0 16.5 -syslibroot "$SDK" -o "$APP/VCAMPRO" "$OUT/main.o" \
  -L"$SDK/usr/lib" -lSystem -lobjc -framework Foundation -framework UIKit -framework AVFoundation \
  -framework AVKit -framework MobileCoreServices -framework CoreMedia -framework CoreGraphics -framework QuartzCore
python3 - "$TEMPLATE/Info.plist" "$APP/Info.plist" <<'PY'
import plistlib,sys
p=plistlib.load(open(sys.argv[1],'rb'))
p.update(CFBundleShortVersionString='1.3',CFBundleVersion='4',MinimumOSVersion='15.0',
 NSPhotoLibraryUsageDescription='Sélectionner une vidéo pour VCAMPRO.',
 NSAppTransportSecurity={'NSAllowsArbitraryLoads':False})
plistlib.dump(p,open(sys.argv[2],'wb'))
PY
nix run nixpkgs#ldid -- -S "$APP/VCAMPRO"
chmod 755 "$APP/VCAMPRO"
cat > "$OUT/package/DEBIAN/control" <<'EOF'
Package: com.vcamproinstaller.app
Name: VCAMPRO
Version: 1.3
Architecture: iphoneos-arm64
Description: VCAMPRO avec activation en ligne, apercu, rotation et miroir. Le tweak camera original reste requis et inchange.
Maintainer: VCAMPRO INSTALLER
Author: VCAMPRO INSTALLER
Section: Applications
Depends: com.vcamproinstaller.virtualcamera, firmware (>= 15.0)
EOF
cat > "$OUT/package/DEBIAN/postinst" <<'EOF'
#!/bin/sh
uicache -p /var/jb/Applications/VCAMPRO.app 2>/dev/null || uicache --all 2>/dev/null || true
exit 0
EOF
chmod 755 "$OUT/package/DEBIAN/postinst"
nix run nixpkgs#dpkg -- --build --root-owner-group "$OUT/package" "$OUT/VCAMPRO_App_1.3.deb"