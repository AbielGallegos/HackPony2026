// Modo de datos (dueño: Abiel). Se decide UNA vez al arrancar el servidor.
//
//  "supabase"       → variables públicas presentes y válidas. Es el ÚNICO modo permitido en producción.
//  "local"          → respaldo en memoria con sesiones SIMULADAS. Solo si:
//                       · NODE_ENV !== "production"  (npm run dev), y
//                       · ALLOW_LOCAL_MODE=1 explícito.
//  "misconfigured"  → cualquier otro caso. La app falla de forma segura (503) y no crea sesiones.
//
// Nunca se cambia a "local" automáticamente: si falta Supabase, la app se detiene.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const LOCAL_REQUESTED = process.env.ALLOW_LOCAL_MODE === "1";

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

/** Devuelve un mensaje de error (sin valores secretos) o null si la configuración de Supabase es válida. */
export function validateSupabaseConfig(url = SUPABASE_URL, key = SUPABASE_KEY) {
  if (!url && !key) return "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
  if (!url) return "Falta NEXT_PUBLIC_SUPABASE_URL.";
  if (!key) return "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

  let u;
  try {
    u = new URL(url);
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL no es una URL válida.";
  }
  const isLocalHost = ["localhost", "127.0.0.1"].includes(u.hostname);
  if (u.protocol !== "https:" && !isLocalHost) return "NEXT_PUBLIC_SUPABASE_URL debe usar https://.";

  // Protección crítica: una llave privilegiada en una variable NEXT_PUBLIC_* terminaría en el navegador.
  if (key.startsWith("sb_secret_")) return "La llave pública es una llave SECRETA (sb_secret_…). Usa la publishable key.";
  if (key.startsWith("eyJ")) {
    const role = jwtRole(key);
    if (role === "service_role") return "La llave pública es la service_role. Usa la publishable/anon key.";
    if (role !== "anon") return "La llave pública no parece una anon key válida.";
  } else if (!key.startsWith("sb_publishable_")) {
    return "La llave pública debe empezar con sb_publishable_ (o ser la anon key).";
  }
  return null;
}

function decide() {
  const error = validateSupabaseConfig();
  if (!error) return { mode: "supabase", error: null };
  if (LOCAL_REQUESTED && !IS_PRODUCTION) return { mode: "local", error: null };
  if (LOCAL_REQUESTED && IS_PRODUCTION) return { mode: "misconfigured", error: `ALLOW_LOCAL_MODE no está permitido en producción. ${error}` };
  return { mode: "misconfigured", error };
}

const decision = decide();
export const DATA_MODE = decision.mode;
export const CONFIG_ERROR = decision.error;
export const isLocal = DATA_MODE === "local";
export const isSupabase = DATA_MODE === "supabase";

if (DATA_MODE === "misconfigured") console.error(`[puente-tecnico] Configuración inválida: ${CONFIG_ERROR}`);
if (DATA_MODE === "local") console.warn("[puente-tecnico] MODO LOCAL DE DESARROLLO: sesiones simuladas, sin RLS. No usar en la demo ni publicar.");

export class ConfigError extends Error {}
/** Lanza si la app no está configurada. Úsala antes de cualquier acceso a datos o sesión. */
export function assertConfigured() {
  if (DATA_MODE === "misconfigured") throw new ConfigError("El servicio no está configurado correctamente.");
}
