// Convierte errores esperados en { ok:false, error } para mostrarlos en la interfaz.
// Cualquier otro error (incluido redirect() de Next) se vuelve a lanzar.
import { AuthError } from "./auth.mjs";
import { ValidationError } from "./validation.mjs";
import { DataError } from "./queries.mjs";

export async function safe(fn) {
  try {
    const data = await fn();
    return { ok: true, ...(data ?? {}) };
  } catch (e) {
    if (e instanceof AuthError || e instanceof ValidationError || e instanceof DataError) return { ok: false, error: e.message };
    throw e;
  }
}

/** Solo rutas internas para ?next= (evita redirecciones a sitios externos). */
export function safeNext(next, fallback) {
  const v = String(next ?? "");
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
}
