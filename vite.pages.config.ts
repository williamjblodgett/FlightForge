import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { brand } from "./config/brand.ts";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const manifestSource = JSON.stringify({
  name: `${brand.productName} Interactive Demo`,
  short_name: brand.productName,
  description: "Course discovery, booking, offline scoring, events, bag intelligence, and explainable disc golf guidance.",
  start_url: "./#home",
  scope: "./",
  display: "standalone",
  background_color: "#eef2eb",
  theme_color: brand.colors.primary[950],
  icons: [{ src: "./icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
}, null, 2);
const iconSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title"><title id="title">${escapeXml(brand.productName)}</title><rect width="512" height="512" rx="112" fill="${brand.colors.primary[950]}"/><circle cx="256" cy="256" r="176" fill="none" stroke="${brand.colors.primary[700]}" stroke-width="18"/><path d="M164 112h214v70H244v66h116v68H244v92h-80z" fill="${brand.colors.secondary[300]}"/><path d="M105 362c84 52 205 69 305 8" fill="none" stroke="${brand.colors.accent}" stroke-linecap="round" stroke-width="18"/></svg>`;

const brandAssetsPlugin: Plugin = {
  name: "flightforge-brand-assets",
  transformIndexHtml(html) {
    return html
      .replaceAll("{{PRODUCT_NAME}}", brand.productName)
      .replaceAll("{{TAGLINE}}", "Find your line. Forge your game.");
  },
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const path = request.url?.split("?", 1)[0];
      if (path === "/manifest.webmanifest") {
        response.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
        response.end(manifestSource);
        return;
      }
      if (path === "/icon.svg") {
        response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        response.end(iconSource);
        return;
      }
      next();
    });
  },
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: manifestSource });
    this.emitFile({ type: "asset", fileName: "icon.svg", source: iconSource });
  },
};

export default defineConfig({
  root: resolve(import.meta.dirname, "pages-demo"),
  base: repositoryName ? `/${repositoryName}/` : "/",
  publicDir: resolve(import.meta.dirname, "public"),
  plugins: [react(), brandAssetsPlugin],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, "pages-dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
});

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}
