import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
    "process.env": {},
  },
  resolve: {
    alias: {
      events: "events",
      util: "util",
      // Provide a browser-safe process polyfill
      process: "process/browser",
    },
  },
  optimizeDeps: {
    include: ["events", "util", "process/browser"],
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/uploads": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});