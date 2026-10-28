import { describe, expect, it } from "vitest";
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { sitemapStaticPaths, sitemapXML } from "./sitemap";

describe("public sitemap", () => {
  it("includes only public content and excludes an entire owner section", () => {
    const root = createRootRoute({ staticData: { sitemap: false } });
    const home = createRoute({ getParentRoute: () => root, path: "/", staticData: { sitemap: true } });
    const auth = createRoute({ getParentRoute: () => root, path: "auth", staticData: { sitemap: false } });
    const purchase = createRoute({ getParentRoute: () => root, path: "achat/retour", staticData: { sitemap: false } });
    const owner = createRoute({ getParentRoute: () => root, id: "owner", staticData: { sitemap: "exclude-subtree" } });
    const panel = createRoute({ getParentRoute: () => owner, path: "painel", staticData: { sitemap: true } });
    const router = createRouter({ routeTree: root.addChildren([home, auth, purchase, owner.addChildren([panel])]) });
    expect(sitemapStaticPaths(router)).toEqual(["/"]);
  });

  it("uses the public domain and omits invented modification dates", () => {
    const xml = sitemapXML("https://vcamproinstaller.com", [{ path: "/" }, { path: "/" }]);
    expect(xml).toContain("<loc>https://vcamproinstaller.com/</loc>");
    expect(xml.match(/<url>/g)).toHaveLength(1);
    expect(xml).not.toContain("<lastmod>");
  });
});