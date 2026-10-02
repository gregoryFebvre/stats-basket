import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { CLUB } from "./src/club.config";

export default defineConfig({
  base: "./", // fonctionne sur n'importe quel hébergement statique, sous-dossier compris
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: `Stats basket ${CLUB.nom} ${CLUB.equipe}`,
        short_name: `Stats ${CLUB.equipe}`,
        lang: "fr",
        start_url: "./",
        scope: "./",
        display: "standalone",
        theme_color: CLUB.couleurPrincipale,
        background_color: "#f0f2f5",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg}"], navigateFallback: "index.html" },
    }),
  ],
  build: {
    rollupOptions: {
      output: { manualChunks: { recharts: ["recharts"], react: ["react", "react-dom", "react-router-dom"] } },
    },
  },
  test: { include: ["tests/**/*.test.{ts,tsx}"], setupFiles: ["tests/setup.ts"] },
});
