import { defineConfig } from "vite";
import { resolve } from "node:path";

const root = process.cwd();

/** Bundle promo live demos into docs/assets for GitHub Pages. */
export default defineConfig({
  resolve: {
    alias: {
      "@figment/host": resolve(root, "packages/host/src/index.ts"),
      "@figment/gpu": resolve(root, "packages/gpu/src/index.ts"),
      "@figment/ui": resolve(root, "packages/ui/src/index.ts"),
    },
  },
  build: {
    outDir: "docs/assets",
    emptyOutDir: false,
    lib: {
      entry: resolve(root, "promo-src/demos.ts"),
      name: "FigmentPromo",
      formats: ["es"],
      fileName: () => "promo-demos.js",
    },
    rollupOptions: {
      external: [],
    },
    target: "es2022",
    minify: true,
  },
});
