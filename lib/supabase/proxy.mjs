// Refresca la sesión de Supabase en cada petición y protege rutas privadas (dueño: Abiel).
// Next.js 16: este código se llama desde proxy.js (antes middleware.ts).
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY, isLocal, DATA_MODE } from "../mode.mjs";

const PRIVATE = ["/perfil", "/empresa", "/estudiantes"];

const UNAVAILABLE_HTML = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Servicio no disponible</title><body style="font-family:system-ui;max-width:560px;margin:15vh auto;padding:0 20px;color:#0f172a">
<h1>Servicio no disponible</h1><p>La aplicación no está configurada correctamente, así que se detuvo por seguridad.</p>
<p style="color:#64748b;font-size:14px">Administrador: revisa las variables de Supabase en el servidor (detalle en el registro).</p></body></html>`;

export async function updateSession(request) {
  // Falla segura: sin Supabase válido (y sin modo local explícito de desarrollo) no se atiende ninguna ruta.
  if (DATA_MODE === "misconfigured") {
    return new NextResponse(UNAVAILABLE_HTML, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  let response = NextResponse.next({ request });
  if (isLocal) return response; // modo local de DESARROLLO: las páginas validan con la sesión simulada

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // No poner código entre createServerClient y getUser (recomendación de Supabase).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PRIVATE.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
