import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  base: process.env.VITE_BASE_PATH,
  server: {
    // Allow the dev server to be reverse-proxied by Next.js at /api/tailux/*
    // The HMR WebSocket must still talk to the real Vite port (5173),
    // otherwise the browser tries ws://localhost:3000 and fails.
    hmr: {
      host: "localhost",
      port: 5173,
      protocol: "ws",
    },
    // Allow being loaded in iframe from a different origin
    cors: true,
  },
});

