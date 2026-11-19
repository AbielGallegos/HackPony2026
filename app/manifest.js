// Web App Manifest (PWA). Next.js 16 lo publica en /manifest.webmanifest.
// Sin service worker a propósito: no se guarda en caché ninguna página privada ni respuesta autenticada.
import { BRAND } from "@/lib/brand.mjs";

export default function manifest() {
  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    lang: "es-MX",
    start_url: "/retos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND.backgroundColor,
    theme_color: BRAND.themeColor,
    categories: ["education", "business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
