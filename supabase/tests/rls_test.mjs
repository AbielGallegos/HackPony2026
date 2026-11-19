// Pruebas de acceso cruzado (RLS) en Node — misma lógica que rls_test.sh, sin necesitar psql.
// Uso:  npm i --no-save pg
//       PGURL="postgresql://postgres@localhost:5432" node supabase/tests/rls_test.mjs
// Crea la base "pt_rls_test" desde cero en un PostgreSQL LOCAL (nunca en Supabase).
import { readFileSync } from "node:fs";
import pg from "pg";

const PGURL = process.env.PGURL ?? "postgresql://postgres@localhost:5432";
const DB = "pt_rls_test";
const root = new URL("../../", import.meta.url);
const file = (p) => readFileSync(new URL(p, root), "utf8");

const ANA = "11111111-1111-1111-1111-111111111111";
const BETO = "22222222-2222-2222-2222-222222222222";
const EMP_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const EMP_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const R_OPEN = "c0000000-0000-0000-0000-000000000001";
const R_CLOSED = "c0000000-0000-0000-0000-000000000002";

const admin = new pg.Client({ connectionString: `${PGURL}/postgres` });
await admin.connect();
await admin.query(`drop database if exists ${DB}`);
await admin.query(`create database ${DB}`);
await admin.end();

const db = new pg.Client({ connectionString: `${PGURL}/${DB}` });
await db.connect();
for (const f of ["supabase/tests/shim_supabase_local.sql", "supabase/migrations/001_schema.sql", "supabase/migrations/002_rls.sql", "supabase/migrations/003_create_challenge.sql", "supabase/seed.sql"]) {
  await db.query(file(f));
}
await db.query(`
insert into auth.users (id, email, raw_user_meta_data) values
 ('${ANA}',  'ana@demo.mx',  '{"role":"student","display_name":"Ana"}'),
 ('${BETO}', 'beto@demo.mx', '{"role":"student","display_name":"Beto"}'),
 ('${EMP_A}','a@demo.mx',    '{"role":"company","display_name":"Empresa A"}'),
 ('${EMP_B}','b@demo.mx',    '{"role":"company","display_name":"Empresa B"}');
insert into challenges (id, company_id, title, status) values
 ('${R_OPEN}', '${EMP_A}', 'Reto abierto de A', 'open'),
 ('${R_CLOSED}', '${EMP_A}', 'Reto cerrado de A', 'closed');
insert into challenge_skills values ('${R_OPEN}','react',true), ('${R_OPEN}','sql',false);
insert into applications (challenge_id, student_id, score_at_apply) values ('${R_OPEN}', '${BETO}', 50);`);

// Ejecuta el SQL como un usuario (rol authenticated + auth.uid()), anónimo o el servicio de Auth; siempre con rollback.
async function run(who, sql) {
  const role = who === "anon" ? "anon" : who === "admin" ? "postgres" : "authenticated";
  const sub = who === "anon" || who === "admin" ? "" : who;
  await db.query("begin");
  try {
    await db.query(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
    const res = await db.query(sql);
    const last = Array.isArray(res) ? res.at(-1) : res;
    const row = last.rows?.[0];
    return { value: row ? String(Object.values(row)[0]) : "" };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.query("rollback");
  }
}

const TESTS = [
  ["section", "— Registro y roles"],
  ["error", "Registro con rol inv\u00e1lido es rechazado por el trigger", "admin", `insert into auth.users (email, raw_user_meta_data) values ('x@x.mx','{"role":"admin"}')`],
  ["value", "El trigger crea perfil + fila de estudiante", ANA, `select count(*) from students where id='${ANA}'`, "1"],
  ["error", "Estudiante NO puede cambiar su rol a company", ANA, `update profiles set role='company' where id='${ANA}'`],
  ["value", "Estudiante s\u00ed puede cambiar su nombre", ANA, `with u as (update profiles set display_name='Ana R.' where id='${ANA}' returning 1) select count(*) from u`, "1"],
  ["value", "Estudiante no modifica el perfil de otro (0 filas)", ANA, `with u as (update students set bio='hack' where id='${BETO}' returning 1) select count(*) from u`, "0"],
  ["section", "— Habilidades y portafolio"],
  ["value", "Estudiante agrega habilidad propia", ANA, `with i as (insert into student_skills values ('${ANA}','react',0) returning 1) select count(*) from i`, "1"],
  ["error", "Estudiante NO agrega habilidad a otro", ANA, `insert into student_skills values ('${BETO}','react',0)`],
  ["error", "Empresa NO agrega habilidades de estudiante", EMP_A, `insert into student_skills values ('${EMP_A}','react',0)`],
  ["error", "Habilidad fuera del cat\u00e1logo es rechazada", ANA, `insert into student_skills values ('${ANA}','cobol',0)`],
  ["error", "Proyecto con URL sin https es rechazado", ANA, `insert into portfolio_projects (student_id,title,repo_url) values ('${ANA}','Mi app','http://x.com')`],
  ["value", "An\u00f3nimo no puede leer estudiantes (0 filas)", "anon", `select count(*) from students`, "0"],
  ["section", "— Retos"],
  ["error", "Estudiante NO publica retos", ANA, `insert into challenges (company_id,title) values ('${ANA}','Reto falso')`],
  ["error", "Empresa B NO publica a nombre de A", EMP_B, `insert into challenges (company_id,title) values ('${EMP_A}','Reto falso')`],
  ["value", "Empresa B NO modifica retos de A (0 filas)", EMP_B, `with u as (update challenges set title='hackeado' where id='${R_OPEN}' returning 1) select count(*) from u`, "0"],
  ["value", "Empresa A cierra su reto", EMP_A, `with u as (update challenges set status='closed' where id='${R_OPEN}' returning 1) select count(*) from u`, "1"],
  ["error", "Empresa A NO puede reasignar su reto a B", EMP_A, `update challenges set company_id='${EMP_B}' where id='${R_OPEN}'`],
  ["value", "An\u00f3nimo ve solo retos abiertos", "anon", `select count(*) from challenges`, "1"],
  ["value", "Estudiante no ve retos cerrados ajenos", ANA, `select count(*) from challenges where id='${R_CLOSED}'`, "0"],
  ["error", "Empresa B NO agrega habilidades al reto de A", EMP_B, `insert into challenge_skills values ('${R_OPEN}','docker',true)`],
  ["value", "Empresa publica reto con create_challenge (transacci\u00f3n)", EMP_B, `select create_challenge('Landing para el Buen Fin','x',5000,'2 semanas','Remoto',array['html','css'],array['javascript','css']); select count(*) from challenge_skills cs join challenges c on c.id = cs.challenge_id where c.title = 'Landing para el Buen Fin'`, "3"],
  ["error", "Estudiante NO puede usar create_challenge", ANA, `select create_challenge('Reto falso de Ana','x',0,null,null,array['html'],null)`],
  ["error", "create_challenge sin obligatorias es rechazado", EMP_B, `select create_challenge('Reto sin reglas','x',0,null,null,array[]::text[],array['html'])`],
  ["error", "create_challenge con habilidad inexistente no deja reto a medias", EMP_B, `select create_challenge('Reto con cobol','x',0,null,null,array['cobol'],null)`],
  ["section", "— Postulaciones"],
  ["value", "Estudiante se postula a reto abierto", ANA, `with i as (insert into applications (challenge_id,student_id,score_at_apply) values ('${R_OPEN}','${ANA}',75) returning 1) select count(*) from i`, "1"],
  ["error", "Postulaci\u00f3n duplicada es rechazada", BETO, `insert into applications (challenge_id,student_id,score_at_apply) values ('${R_OPEN}','${BETO}',50)`],
  ["error", "Postular a reto cerrado es rechazado", ANA, `insert into applications (challenge_id,student_id,score_at_apply) values ('${R_CLOSED}','${ANA}',75)`],
  ["error", "Postular en nombre de otro es rechazado", ANA, `insert into applications (challenge_id,student_id,score_at_apply) values ('${R_OPEN}','${BETO}',99)`],
  ["error", "Empresa NO puede postularse", EMP_A, `insert into applications (challenge_id,student_id,score_at_apply) values ('${R_OPEN}','${EMP_A}',99)`],
  ["value", "Empresa A ve postulantes de su reto", EMP_A, `select count(*) from applications where challenge_id='${R_OPEN}'`, "1"],
  ["value", "Empresa B NO ve postulantes de retos de A", EMP_B, `select count(*) from applications`, "0"],
  ["value", "Estudiante ve solo sus postulaciones", ANA, `select count(*) from applications`, "0"],
  ["value", "Empresa A cambia estado de postulaci\u00f3n", EMP_A, `with u as (update applications set status='en_revision' where challenge_id='${R_OPEN}' returning 1) select count(*) from u`, "1"],
  ["error", "Empresa A NO puede alterar el puntaje guardado", EMP_A, `update applications set score_at_apply=100 where challenge_id='${R_OPEN}'`],
  ["value", "Estudiante NO cambia el estado de su postulaci\u00f3n (0 filas)", BETO, `with u as (update applications set status='seleccionado' where student_id='${BETO}' returning 1) select count(*) from u`, "0"],
  ["value", "Cifras p\u00fablicas sin exponer filas", "anon", `select (public_stats()->>'students')`, "2"],
];

let pass = 0, fail = 0;
for (const [kind, name, who, sql, want] of TESTS) {
  if (kind === "section") { console.log(name); continue; }
  const r = await run(who, sql);
  const ok = kind === "error" ? Boolean(r.error) : r.value === want;
  if (ok) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.log(`✗ ${name}  → ${kind === "error" ? "se esperaba error, salió " + JSON.stringify(r) : `esperado '${want}', salió ${JSON.stringify(r)}`}`); }
}
await db.end();
console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
