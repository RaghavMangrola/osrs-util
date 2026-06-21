import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // Frontend tests only. The server/ tests run on Node's test runner
    // (npm run server:test), not Vitest.
    include: ["src/**/*.test.{ts,tsx}"],
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    // In dev, the Vite server provides HMR while the Express server (npm run
    // serve) handles the API. Proxy /api to it so the app behaves the same as
    // in production, where Express serves the built app and the API together.
    proxy: {
      "/api": "http://127.0.0.1:4317",
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
