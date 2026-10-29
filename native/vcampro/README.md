# VCAMPRO 1.3 — experimental rootless iOS companion app

Reconstructed companion app, not a patch to the original camera library. Requires iOS 15+ and the existing `com.vcamproinstaller.virtualcamera` package. Same bundle/package ID as 1.2. Logo and icons copied unchanged from 1.2.

## License behavior

- French activation screen; POST to `https://vcamproinstaller.com/api/public/licenses/verify` with `code` and `environment: live`.
- Only the code is saved; an active license is not cached offline. Each foreground entry and each protected command checks online.
- Missing network, invalid/revoked license, malformed response, or expiration disables companion controls. No test license or download master code bypass.
- Disable replacement remains available to restore the real camera.
- Renewal opens `https://vcamproinstaller.com/licences`; sandbox licenses are intentionally not accepted by this production-targeted app.
- No device binding is implemented. The existing website endpoint does not offer it.

## Preserved contract and limitations

Choose writes `/var/jb/var/mobile/Library/temp.mov`, preview plays that file, rotate exports 90° clockwise, mirror exports horizontally, disable removes it. Export retains audio and replaces media only after successful completion with a still-valid license. Original camera dylib, injection filters and photo/video hooks are neither packaged nor changed.

Blocking companion controls **does not enforce licensing inside the independent original tweak**, nor stop an already selected video when the companion is closed. Full camera enforcement would require separately modifying/cooperating with that tweak; this version deliberately does not do that.

Compiled and ad-hoc signed for arm64, not App Store/OTA signing. Installation, launch, gallery access, filesystem permissions, photo/video capture and transforms remain untested on an actual jailbroken iPhone. Rebuilt controls are not proven behavior-identical to 1.2. Online activation cannot succeed until the website license endpoint is published; the primary domain returned 404 during preparation.

## Reproduce

Tools used: Nix Clang 21.1.7 (unwrapped clang.cc for iOS), ld64.lld, ldid 2.1.5, dpkg-deb, Theos iPhoneOS16.5.sdk. SDK download source: https://github.com/theos/sdks. Respect the SDK's licensing terms.

Extract the previous DEB into a temporary directory, set `SDK` and `TEMPLATE` to its VCAMPRO.app, then run `bash native/vcampro/build.sh`. Generated output defaults to `/tmp/vcampro-native/build`. The build first runs `LicensePolicy.test.c`, then compiles and signs the Mach-O and packages the DEB with gzip compression. No SDK or compiler is included in the source tree.