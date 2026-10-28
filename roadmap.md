# Roadmap

- [x] Translate all site screens, messages and date formatting into French without changing password rules; verify home, login and authenticated owner panel.

- [x] Apply the owner's VCAMPRO INSTALLER logo on the site and favicon, and match the accent to its cyan color.
- [x] Restore dependency downloads and verify the logo on the home and login pages, including the mobile header and favicon.
- [x] Add the owner's permanent test code 170-214 and make the middle dash appear automatically while typing; verify unlock, masking and rejection of a wrong code in the preview.
- [x] Add a 10 € button to buy a 10-minute code generated automatically after payment.
- [x] Add a button that shows a purchased code again in the same browser while it is still valid, and hides it once the code has been used or has expired.


- [ ] CERTIFICATE (future idea, NOT to build now): one Safari link that installs the Apple provisioning profile (UDID saved automatically to the developer account), then a "Baixar o KSign" button appears on the same page to download KSign. User confirmed the name and the joined flow.

- [x] Review SEO foundations and add a router-derived public sitemap, excluding owner, auth and purchase flows.
- [x] Add the VCAMPRO INSTALLER DNS profile with the owner's logo and site shortcut, downloadable only after a valid code through a 10-minute signed link.
- [ ] French VCAMPRO camera menu companion: arm64 .deb built (VCAMPRO_Menu_Francais_0.1.0.deb); waiting on owner iPhone test. arm64e slice not built (no linker support here).
