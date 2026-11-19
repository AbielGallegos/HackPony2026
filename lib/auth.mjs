// Sesión y roles (dueño: Abiel).
// getUser() SIEMPRE valida en el servidor: con Supabase usa auth.getUser() (verifica el token con Auth),
// nunca un id que venga del formulario.
import { cache } from "react";
import { cookies } from "next/headers";
import { isLocal, isSupabase } from "./mode.mjs";
import { createClient } from "./supabase/server.mjs";
import { store } from "./local-store.mjs";

export const LOCAL_SESSION_COOKIE = "pt_demo_session";

export class AuthError extends Error {}

/** @returns {Promise<null | {id:string, role:'student'|'company', displayName:string, email:string}>} */
export const getUser = cache(async () => {
  if (!isLocal && !isSupabase) return null; // configuración inválida: nunca hay sesión
  if (isLocal) {
    const id = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
    const p = id && store().profiles.find((x) => x.id === id);
    return p ? { id: p.id, role: p.role, displayName: p.display_name, email: p.email } : null;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).maybeSingle();
  if (!profile) return null; // usuario sin perfil (no debería pasar: lo crea el trigger)
  return { id: user.id, role: profile.role, displayName: profile.display_name, email: user.email };
});

/** Lanza AuthError si no hay sesión o el rol no coincide. Usar al inicio de CADA Server Action. */
export async function requireRole(role) {
  const user = await getUser();
  if (!user) throw new AuthError("Inicia sesión para continuar.");
  if (role && user.role !== role)
    throw new AuthError(role === "student" ? "Esta acción es solo para estudiantes." : "Esta acción es solo para empresas.");
  return user;
}
