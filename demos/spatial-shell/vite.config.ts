import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5175,
    host: "127.0.0.1",
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
});
