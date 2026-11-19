// Carga las cuentas y datos de demostración en Supabase (dueño: Cid).
// Uso (una sola vez, desde la computadora de Cid):  npm run seed:demo
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
// ⚠ La service_role ignora RLS: NUNCA la pongas en Vercel ni en el código del navegador.
import { createClient } from "@supabase/supabase-js";
import * as demo from "../lib/demo-data.mjs";
import { computeMatch } from "../lib/matching.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD ?? "";
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
// Contraseña fuerte y renovada (mínimo 16 caracteres): la anterior, que estuvo en el código, queda descartada.
if (password.length < 16 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
  console.error("DEMO_PASSWORD falta o es débil. Genera una con: npm run demo:password");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

async function listDemoUsers() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 200) break;
  }
  return all.filter((u) => u.email?.endsWith("@demo.puentetecnico.mx"));
}

async function main() {
  // 1) Borrar cuentas demo anteriores (cascada: perfiles, retos, postulaciones).
  const old = await listDemoUsers();
  for (const u of old) must(await sb.auth.admin.deleteUser(u.id), `borrar ${u.email}`);
  console.log(`Cuentas demo anteriores borradas: ${old.length}`);

  // 2) Crear usuarios confirmados. El trigger handle_new_user crea profiles + students/companies.
  const ids = {};
  const create = async (email, role, display_name) => {
    const data = must(
      await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role, display_name } }),
      `crear ${email}`
    );
    return data.user.id;
  };
  for (const c of demo.companies) ids[c.key] = await create(c.email, "company", c.company_name);
  for (const s of demo.students) ids[s.key] = await create(s.email, "student", s.display_name);
  console.log(`Usuarios creados: ${Object.keys(ids).length}`);

  // 3) Completar perfiles
  for (const c of demo.companies) {
    must(await sb.from("companies").update({ sector: c.sector, city: c.city, description: c.description, website_url: c.website_url }).eq("id", ids[c.key]), `empresa ${c.key}`);
  }
  for (const s of demo.students) {
    const id = ids[s.key];
    must(await sb.from("students").update({ university: s.university, career: s.career, semester: s.semester, city: s.city, bio: s.bio, github_username: s.github_username }).eq("id", id), `estudiante ${s.key}`);
    if (s.skills.length) must(await sb.from("student_skills").insert(s.skills.map((k) => ({ student_id: id, skill_slug: k.slug, evidence_count: k.evidence_count }))), `habilidades ${s.key}`);
    if (s.projects.length) must(await sb.from("portfolio_projects").insert(s.projects.map((p) => ({ student_id: id, title: p.title, description: p.description ?? null, repo_url: p.repo_url ?? null }))), `proyectos ${s.key}`);
  }

  // 4) Retos con sus habilidades
  const challengeIds = {};
  for (const c of demo.challenges) {
    const row = must(
      await sb.from("challenges").insert({ company_id: ids[c.company], title: c.title, description: c.description, status: c.status, reward_mxn: c.reward_mxn, duration: c.duration, modality: c.modality, created_at: c.created_at }).select("id").single(),
      `reto ${c.key}`
    );
    challengeIds[c.key] = row.id;
    must(await sb.from("challenge_skills").insert([...c.required.map((slug) => ({ challenge_id: row.id, skill_slug: slug, is_required: true })), ...c.nice.map((slug) => ({ challenge_id: row.id, skill_slug: slug, is_required: false }))]), `habilidades reto ${c.key}`);
  }

  // 5) Postulaciones con el % calculado por el mismo motor de la app
  for (const a of demo.applications) {
    const s = demo.students.find((x) => x.key === a.student);
    const c = demo.challenges.find((x) => x.key === a.challenge);
    const score = computeMatch(s.skills, [...c.required.map((slug) => ({ slug, is_required: true })), ...c.nice.map((slug) => ({ slug, is_required: false }))]).score;
    must(await sb.from("applications").insert({ challenge_id: challengeIds[a.challenge], student_id: ids[a.student], status: a.status, score_at_apply: score, created_at: a.created_at }), `postulación ${a.student}`);
  }

  console.log(`Listo: ${demo.companies.length} empresas, ${demo.students.length} estudiantes, ${demo.challenges.length} retos, ${demo.applications.length} postulaciones.`);
  console.log("Contraseña de las cuentas demo: la de DEMO_PASSWORD en tu .env.local (no se imprime).");
  console.log(`Ejemplos: ${demo.students[0].email} (estudiante) · ${demo.companies[0].email} (empresa)`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
