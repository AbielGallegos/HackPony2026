// Verifica un proyecto REAL de Supabase de punta a punta (dueño: Abiel).
// Uso:  npm run verify:supabase      (lee .env.local; no imprime ninguna llave)
//
// Comprueba: configuración, 9 tablas, catálogo, funciones, trigger de registro y RLS con ataques reales.
// Crea usuarios temporales (@verificacion.puentetecnico.mx) y los BORRA al terminar (también si algo falla).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { validateSupabaseConfig } from "../lib/mode.mjs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.log(`✗ ${name}${detail ? "  → " + detail : ""}`); }
};
const section = (t) => console.log(`\n— ${t}`);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

const configError = validateSupabaseConfig(URL_, PUB);
if (configError) { console.error(`Configuración inválida: ${configError}`); process.exit(1); }
if (!SERVICE) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (solo para esta verificación)."); process.exit(1); }

const admin = createClient(URL_, SERVICE, opts);
const anon = createClient(URL_, PUB, opts);
const tag = randomBytes(4).toString("hex");
const pwd = randomBytes(18).toString("base64url") + "Aa1";
const created = [];

async function newUser(role, name) {
  const email = `${role}-${tag}-${created.length}@verificacion.puentetecnico.mx`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: pwd, email_confirm: true, user_metadata: { role, display_name: name } });
  if (error) throw new Error(`crear usuario ${role}: ${error.message}`);
  created.push(data.user.id);
  const client = createClient(URL_, PUB, opts);
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: pwd });
  if (e2) throw new Error(`iniciar sesión ${role}: ${e2.message}`);
  return { id: data.user.id, client };
}

async function main() {
  section("Conexión y esquema");
  const TABLES = ["profiles", "students", "companies", "skills", "student_skills", "portfolio_projects", "challenges", "challenge_skills", "applications"];
  for (const t of TABLES) {
    const { error } = await admin.from(t).select("*", { count: "exact", head: true });
    ok(`Tabla ${t} existe`, !error, error?.message);
  }
  const { count: skills } = await anon.from("skills").select("*", { count: "exact", head: true });
  ok("Catálogo de habilidades cargado (31)", skills === 31, `hay ${skills}`);
  const { data: stats, error: eStats } = await anon.rpc("public_stats");
  ok("public_stats() responde a visitantes", !eStats && stats && typeof stats.challenges === "number", eStats?.message);
  const { data: anonStudents } = await anon.from("students").select("id").limit(1);
  ok("Visitante anónimo NO lee estudiantes", (anonStudents ?? []).length === 0);

  section("Registro (trigger handle_new_user)");
  const { error: badRole } = await admin.auth.admin.createUser({ email: `admin-${tag}@verificacion.puentetecnico.mx`, password: pwd, email_confirm: true, user_metadata: { role: "admin" } });
  ok("Rol inválido es rechazado", Boolean(badRole));
  const est = await newUser("student", "Estudiante Verificación");
  const empA = await newUser("company", "Empresa A Verificación");
  const empB = await newUser("company", "Empresa B Verificación");
  const { data: prof } = await admin.from("profiles").select("role").eq("id", est.id).single();
  ok("El trigger creó el perfil con su rol", prof?.role === "student");
  const { count: stRow } = await admin.from("students").select("*", { count: "exact", head: true }).eq("id", est.id);
  ok("El trigger creó la fila de estudiante", stRow === 1);

  section("Perfiles y roles");
  const { error: roleChange } = await est.client.from("profiles").update({ role: "company" }).eq("id", est.id);
  ok("Estudiante NO puede cambiar su rol", Boolean(roleChange), roleChange ? "" : "¡se permitió!");
  const { error: skillOk } = await est.client.from("student_skills").insert({ student_id: est.id, skill_slug: "react" });
  ok("Estudiante agrega una habilidad propia", !skillOk, skillOk?.message);
  const { error: skillOther } = await empA.client.from("student_skills").insert({ student_id: est.id, skill_slug: "sql" });
  ok("Empresa NO agrega habilidades a un estudiante", Boolean(skillOther));

  section("Retos");
  const { error: stuChallenge } = await est.client.rpc("create_challenge", { p_title: "Reto falso de estudiante", p_description: "x", p_reward_mxn: 0, p_duration: null, p_modality: null, p_required: ["html"], p_nice: [] });
  ok("Estudiante NO publica retos", Boolean(stuChallenge));
  const { data: rid, error: eCreate } = await empA.client.rpc("create_challenge", { p_title: "Reto de verificación", p_description: "x", p_reward_mxn: 100, p_duration: "1 semana", p_modality: "Remoto", p_required: ["react", "sql"], p_nice: ["git"] });
  ok("Empresa A publica un reto (transacción)", !eCreate && Boolean(rid), eCreate?.message);
  const { data: hijack } = await empB.client.from("challenges").update({ title: "hackeado" }).eq("id", rid).select("id");
  ok("Empresa B NO modifica el reto de A", (hijack ?? []).length === 0);

  section("Postulaciones y ranking");
  const { error: apply1 } = await est.client.from("applications").insert({ challenge_id: rid, student_id: est.id, score_at_apply: 40 });
  ok("Estudiante se postula", !apply1, apply1?.message);
  const { error: apply2 } = await est.client.from("applications").insert({ challenge_id: rid, student_id: est.id, score_at_apply: 40 });
  ok("Segunda postulación al mismo reto es rechazada", apply2?.code === "23505", apply2?.message);
  const { error: applyCo } = await empA.client.from("applications").insert({ challenge_id: rid, student_id: empA.id, score_at_apply: 99 });
  ok("Empresa NO puede postularse", Boolean(applyCo));
  const { data: seenA } = await empA.client.from("applications").select("id").eq("challenge_id", rid);
  ok("Empresa A ve a su candidato", (seenA ?? []).length === 1);
  const { data: seenB } = await empB.client.from("applications").select("id").eq("challenge_id", rid);
  ok("Empresa B NO ve candidatos ajenos", (seenB ?? []).length === 0);
  const { error: scoreTamper } = await empA.client.from("applications").update({ score_at_apply: 100 }).eq("challenge_id", rid);
  ok("Nadie altera el puntaje guardado", Boolean(scoreTamper));
  await empA.client.from("challenges").update({ status: "closed" }).eq("id", rid);
  const est2 = await newUser("student", "Estudiante 2 Verificación");
  const { error: applyClosed } = await est2.client.from("applications").insert({ challenge_id: rid, student_id: est2.id, score_at_apply: 0 });
  ok("No se puede postular a un reto cerrado", Boolean(applyClosed));
}

try {
  await main();
} catch (e) {
  fail++;
  console.log(`✗ Error inesperado: ${e.message}`);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\nUsuarios temporales borrados: ${created.length}`);
  console.log(`Resultado: ${pass} pasaron, ${fail} fallaron`);
  process.exit(fail ? 1 : 0);
}
