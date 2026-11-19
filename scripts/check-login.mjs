// Diagnóstico: intenta iniciar sesión con una cuenta demo usando la llave pública y DEMO_PASSWORD.
// No imprime la contraseña ni las llaves. Uso: node --env-file=.env.local scripts/check-login.mjs [correo]
import { createClient } from "@supabase/supabase-js";
const email = process.argv[2] || "ana@demo.puentetecnico.mx";
const pw = process.env.DEMO_PASSWORD || "";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
console.log("Proyecto:", new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host, "| largo de DEMO_PASSWORD:", pw.length);
const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
if (error) console.log("FALLA:", error.status, error.code, error.message);
else console.log("OK: sesión iniciada como", data.user.email, "rol", data.user.user_metadata?.role);
if (!error) {
  const { data: st, error: e2 } = await sb.rpc("public_stats");
  console.log("public_stats:", e2 ? `FALLA ${e2.code} ${e2.message}` : JSON.stringify(st));
}
