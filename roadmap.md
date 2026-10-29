# Roadmap

- [x] Build separate licensing purchase, owner login and management screens; 15 €/7 days and 60 €/30 days, manual renewals; creation, suspension, reactivation and customer lookup verified with owner session. Existing download panel untouched. Tests passing.
- [ ] Complete a preview test purchase/renewal: Stripe checkout rendered but card fields could not be driven in two browser attempts; owner can test in /licences with 4242 4242 4242 4242, future expiry and any CVC. Paid fulfillment and same-code renewal remain unverified end-to-end.
- [ ] Integrate online license activation into the native VCAMPRO DEB while preserving camera functions, and deliver an updated test package. Blocked: VCAMPRO_App_1.2.deb contains only a compiled executable; its editable app source and prior iOS build environment are unavailable. The French-menu source archive is a separate tweak, not this app. POST https://vcamproinstaller.com/api/public/licenses/verify returned HTTP 404 on 2026-10-29; license routes must be published before a domain-based app can activate. No updated DEB generated; website licensing does not restrict the installed app.

- [x] Translate all site screens, messages and date formatting into French without changing password rules; verify home, login and authenticated owner panel.

- [x] Apply the owner's VCAMPRO INSTALLER logo on the site and favicon, and match the accent to its cyan color.
- [x] Restore dependency downloads and verify the logo on the home and login pages, including the mobile header and favicon.
- [x] Add the owner's permanent test code 170-214 and make the middle dash appear automatically while typing; verify unlock, masking and rejection of a wrong code in the preview.
- [x] Add a 10 € button to buy a 10-minute code generated automatically after payment.
- [x] Add a button that shows a purchased code again in the same browser while it is still valid, and hides it once the code has been used or has expired.


- [ ] CERTIFICATE (future idea, NOT to build now): one Safari link that installs the Apple provisioning profile (UDID saved automatically to the developer account), then a "Baixar o KSign" button appears on the same page to download KSign. User confirmed the name and the joined flow.

- [x] Review SEO foundations and add a router-derived public sitemap, excluding owner, auth and purchase flows.
- [x] Add the VCAMPRO INSTALLER DNS profile with the owner's logo and site shortcut, downloadable only after a valid code through a 10-minute signed link.
- [ ] French VCAMPRO camera menu: VCAMPRO_Virtual_Camera_1.1.0.deb has French menu only for arm64 App Store apps; home screen/Apple apps stay Chinese. Blocked on a Mac with Apple's arm64e linker; waiting on owner test inside an App Store app.
- [ ] VCAMPRO home-screen app: VCAMPRO_App_1.2.deb built (arm64: choose, preview, rotate 90°, mirror, disable; only edits temp.mov). Untested on iPhone; waiting on owner test.
