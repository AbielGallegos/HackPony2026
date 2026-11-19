// Cliente de Supabase para Server Components y Server Actions (dueño: Cid).
// Usa la publishable key + las cookies de sesión del usuario ⇒ RLS aplica en cada consulta.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_KEY, isSupabase, ConfigError } from "../mode.mjs";

export async function createClient() {
  if (!isSupabase) throw new ConfigError("Supabase no está configurado.");
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}
