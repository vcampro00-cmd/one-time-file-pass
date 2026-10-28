<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Download passwords are stored only as SHA-256 hashes and redeemed in a public server fn using the admin client; a code is reusable until expires_at (first use recorded in used_at) so a visitor session lasts the full window.
- Shared password rules (TTL, format, status) live in src/lib/codes.ts and are covered by src/lib/codes.test.ts.
- Files live in the private `files` bucket under `<owner_id>/...`; visitors only get short-lived signed URLs.
- Use the shared BrandLogo component for site branding so all screens reference the same uploaded asset; derive the favicon from that asset's symbol.
- Keep server-function chains on the builder methods the installed `@tanstack/start-client-core` actually exports (check `node_modules` before writing a chain): the current build exposes `.validator()`, not `.inputValidator()`, and a renamed method typechecks but crashes the whole page at render.

- Derive sitemap URLs from required route staticData.sitemap decisions through the versioned sitemap helper; exclude owner, auth and purchase flows so future routes cannot leak into search by default.
- Keep one shared router-core version across Router and Start so server-route type augmentations reach the same module.
- Serve the DNS profile only through the public download handler with a 10-minute HMAC token issued by successful code redemption; never place the profile in public assets, so a hidden button is not the only access control.
