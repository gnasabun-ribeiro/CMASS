import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // PWA: la app se instala en el celular y abre sin conexión. El service worker
    // guarda el "cascarón" (HTML/JS/CSS/imágenes y la fuente Inter). Los
    // datos de Supabase NO se cachean acá: los maneja la base local (ver src/lib/localDb.js).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Inspecciones CMASS",
        short_name: "CMASS",
        description: "Inspecciones de seguridad e higiene",
        lang: "es",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        categories: ["business", "productivity"],
        // Accesos directos al mantener apretado el ícono de la app instalada.
        shortcuts: [
          { name: "Mis Registros", short_name: "Registros", url: "/registros", icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }] },
          { name: "Pendientes de enviar", short_name: "Pendientes", url: "/pendientes", icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }] },
          { name: "Panel de seguimiento", short_name: "Panel", url: "/panel", icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }] },
        ],
        orientation: "portrait",
        theme_color: "#701C93",
        background_color: "#701C93",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // gif: íconos animados de Inicio e Inspecciones (src/data/iconosAnimados.js).
        // woff2: la fuente Inter (src/styles/tokens.css), para que se vea igual sin conexión.
        globPatterns: ["**/*.{js,css,html,png,gif,svg,ico,webmanifest,woff2}"],
        navigateFallback: "/index.html",
        // Avisos del navegador con la app cerrada (Web Push): ver public/push-sw.js.
        importScripts: ["push-sw.js"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // React y Supabase en archivos aparte: cambian poco, quedan en caché entre versiones de la app.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  server: {
    host: true,
  },
});
