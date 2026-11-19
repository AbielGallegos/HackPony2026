import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";
import { validateSupabaseConfig } from "./lib/mode.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Fija la raíz del proyecto (evita el aviso por package-lock.json en carpetas superiores)
    root: path.dirname(fileURLToPath(import.meta.url)),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }] },
};

// Falla segura al compilar para producción (Vercel / npm run build):
// sin Supabase válido NO se genera la app. Nunca se publica una versión con sesiones simuladas.
export default function config(phase) {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const error = validateSupabaseConfig();
    if (error) {
      throw new Error(
        `\n\n[puente-tecnico] No se puede compilar para producción: ${error}\n` +
          "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (en .env.local o en Vercel).\n" +
          "Para desarrollar sin Supabase usa `npm run dev` con ALLOW_LOCAL_MODE=1.\n"
      );
    }
  }
  return nextConfig;
}
