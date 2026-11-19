// Acceso a datos (dueño: Cid). Las páginas y Server Actions SOLO usan estas funciones.
// Modo supabase: cliente con la sesión del usuario ⇒ RLS aplica a cada consulta.
// Modo local (solo desarrollo): mismas firmas sobre el almacén en memoria.
import { isLocal } from "./mode.mjs";
import { createClient } from "./supabase/server.mjs";
import { store, resetStore, newId } from "./local-store.mjs";

export class DataError extends Error {}

const clone = (x) => structuredClone(x);

function fail(error) {
  if (!error) return;
  if (error.code === "23505") throw new DataError("Ese registro ya existe.");
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message))
    throw new DataError("No tienes permiso para realizar esta acción.");
  if (error.code === "23514") throw new DataError("Algún dato no cumple el formato permitido.");
  if (error.code === "23503") throw new DataError("Hace referencia a algo que no existe.");
  console.error("[supabase]", error);
  throw new DataError("No se pudo completar la operación. Intenta de nuevo.");
}

// ---------- formas comunes ----------
const CHALLENGE_SELECT =
  "id, company_id, title, description, status, reward_mxn, duration, modality, created_at, company:companies(id, company_name, sector, city), skills:challenge_skills(skill_slug, is_required)";
const STUDENT_SELECT =
  "id, university, career, semester, city, bio, github_username, profile:profiles(display_name), skills:student_skills(skill_slug, evidence_count), projects:portfolio_projects(id, title, description, repo_url, demo_url, language, stars, from_github, created_at)";

const mapChallenge = (c) =>
  c && {
    ...c,
    skills: (c.skills ?? []).map((s) => ({ slug: s.skill_slug, is_required: s.is_required })),
  };

const mapStudent = (s) =>
  s && {
    id: s.id,
    display_name: s.profile?.display_name ?? "",
    university: s.university,
    career: s.career,
    semester: s.semester,
    city: s.city,
    bio: s.bio,
    github_username: s.github_username,
    skills: (s.skills ?? []).map((k) => ({ slug: k.skill_slug, evidence_count: k.evidence_count })),
    projects: [...(s.projects ?? [])].sort((a, b) => Number(b.from_github) - Number(a.from_github) || String(a.created_at).localeCompare(String(b.created_at))),
  };

// ---------- modo local: uniones en memoria ----------
function localChallenge(c) {
  const db = store();
  const co = db.companies.find((x) => x.id === c.company_id);
  return clone({
    ...c,
    company: co && { id: co.id, company_name: co.company_name, sector: co.sector, city: co.city },
    skills: db.challenge_skills.filter((s) => s.challenge_id === c.id).map((s) => ({ slug: s.skill_slug, is_required: s.is_required })),
  });
}
function localStudent(s) {
  const db = store();
  return clone({
    ...s,
    display_name: db.profiles.find((p) => p.id === s.id)?.display_name ?? "",
    skills: db.student_skills.filter((k) => k.student_id === s.id).map((k) => ({ slug: k.skill_slug, evidence_count: k.evidence_count })),
    projects: db.portfolio_projects.filter((p) => p.student_id === s.id).sort((a, b) => Number(b.from_github) - Number(a.from_github)),
  });
}

// ================= LECTURAS =================

export async function getStats() {
  if (isLocal) {
    const db = store();
    const open = db.challenges.filter((c) => c.status === "open");
    return { challenges: open.length, companies: db.companies.length, students: db.students.length, reward_mxn: open.reduce((s, c) => s + c.reward_mxn, 0) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_stats");
  // Las cifras son decorativas: si fallan, la portada se muestra sin ellas en vez de romperse.
  if (error) {
    console.error("[getStats]", error.code, error.message);
    return null;
  }
  return data;
}

/** Retos visibles para el usuario actual. RLS decide cuáles (abiertos, propios o donde se postuló). */
export async function listChallenges({ companyId, onlyOpen = false } = {}) {
  if (isLocal) {
    return store()
      .challenges.filter((c) => (!companyId || c.company_id === companyId) && (!onlyOpen || c.status === "open"))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(localChallenge);
  }
  const supabase = await createClient();
  let q = supabase.from("challenges").select(CHALLENGE_SELECT).order("created_at", { ascending: false });
  if (companyId) q = q.eq("company_id", companyId);
  if (onlyOpen) q = q.eq("status", "open");
  const { data, error } = await q;
  fail(error);
  return data.map(mapChallenge);
}

export async function getChallenge(id) {
  if (isLocal) {
    const c = store().challenges.find((x) => x.id === id);
    return c ? localChallenge(c) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("challenges").select(CHALLENGE_SELECT).eq("id", id).maybeSingle();
  if (error?.code === "22P02") return null; // id con formato inválido
  fail(error);
  return mapChallenge(data);
}

export async function getStudent(id) {
  if (isLocal) {
    const s = store().students.find((x) => x.id === id);
    return s ? localStudent(s) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("students").select(STUDENT_SELECT).eq("id", id).maybeSingle();
  if (error?.code === "22P02") return null;
  fail(error);
  return mapStudent(data);
}

export async function listStudents() {
  if (isLocal) return store().students.map(localStudent);
  const supabase = await createClient();
  const { data, error } = await supabase.from("students").select(STUDENT_SELECT);
  fail(error);
  return data.map(mapStudent);
}

export async function getCompany(id) {
  if (isLocal) return clone(store().companies.find((c) => c.id === id) ?? null);
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  fail(error);
  return data;
}

/** Postulaciones visibles: las propias (estudiante) o las de mis retos (empresa). */
export async function listApplications({ challengeId, studentId } = {}) {
  if (isLocal) {
    return clone(
      store().applications.filter((a) => (!challengeId || a.challenge_id === challengeId) && (!studentId || a.student_id === studentId))
    ).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const supabase = await createClient();
  let q = supabase.from("applications").select("id, challenge_id, student_id, status, score_at_apply, created_at").order("created_at", { ascending: false });
  if (challengeId) q = q.eq("challenge_id", challengeId);
  if (studentId) q = q.eq("student_id", studentId);
  const { data, error } = await q;
  fail(error);
  return data;
}

// ================= ESCRITURAS =================
// En modo local se replican las reglas de RLS (dueño, rol, reto abierto, duplicados).

export async function insertApplication({ challengeId, studentId, score }) {
  if (isLocal) {
    const db = store();
    const c = db.challenges.find((x) => x.id === challengeId);
    if (!c || c.status !== "open") throw new DataError("Este reto ya no recibe postulaciones.");
    if (db.applications.some((a) => a.challenge_id === challengeId && a.student_id === studentId)) return { duplicate: true };
    db.applications.push({ id: newId("a"), challenge_id: challengeId, student_id: studentId, status: "postulado", score_at_apply: score, created_at: new Date().toISOString() });
    return { duplicate: false };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("applications").insert({ challenge_id: challengeId, student_id: studentId, score_at_apply: score });
  if (error?.code === "23505") return { duplicate: true };
  if (error?.code === "42501") throw new DataError("Este reto ya no recibe postulaciones.");
  fail(error);
  return { duplicate: false };
}

export async function updateApplicationStatus({ applicationId, companyId, status }) {
  if (isLocal) {
    const db = store();
    const a = db.applications.find((x) => x.id === applicationId);
    const c = a && db.challenges.find((x) => x.id === a.challenge_id);
    if (!a || c?.company_id !== companyId) throw new DataError("No tienes permiso para realizar esta acción.");
    a.status = status;
    return;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("applications").update({ status }).eq("id", applicationId).select("id");
  fail(error);
  if (!data?.length) throw new DataError("No tienes permiso para realizar esta acción.");
}

export async function insertChallenge({ companyId, title, description, reward_mxn, duration, modality, required, nice }) {
  if (isLocal) {
    const db = store();
    const id = newId("r");
    db.challenges.push({ id, company_id: companyId, title, description, status: "open", reward_mxn, duration, modality, created_at: new Date().toISOString() });
    for (const slug of required) db.challenge_skills.push({ challenge_id: id, skill_slug: slug, is_required: true });
    for (const slug of nice) db.challenge_skills.push({ challenge_id: id, skill_slug: slug, is_required: false });
    return id;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_challenge", {
    p_title: title,
    p_description: description,
    p_reward_mxn: reward_mxn,
    p_duration: duration,
    p_modality: modality,
    p_required: required,
    p_nice: nice,
  });
  fail(error);
  return data;
}

export async function updateChallengeStatus({ challengeId, companyId, status }) {
  if (isLocal) {
    const c = store().challenges.find((x) => x.id === challengeId);
    if (!c || c.company_id !== companyId) throw new DataError("No tienes permiso para realizar esta acción.");
    c.status = status;
    return;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("challenges").update({ status }).eq("id", challengeId).select("id");
  fail(error);
  if (!data?.length) throw new DataError("No tienes permiso para realizar esta acción.");
}

export async function updateStudentProfile(studentId, { display_name, ...fields }) {
  if (isLocal) {
    const db = store();
    Object.assign(db.students.find((s) => s.id === studentId), fields);
    if (display_name) db.profiles.find((p) => p.id === studentId).display_name = display_name;
    return;
  }
  const supabase = await createClient();
  const r1 = await supabase.from("students").update(fields).eq("id", studentId);
  fail(r1.error);
  if (display_name) fail((await supabase.from("profiles").update({ display_name }).eq("id", studentId)).error);
}

export async function addStudentSkill(studentId, slug) {
  if (isLocal) {
    const db = store();
    if (!db.student_skills.some((k) => k.student_id === studentId && k.skill_slug === slug))
      db.student_skills.push({ student_id: studentId, skill_slug: slug, evidence_count: 0 });
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("student_skills").upsert({ student_id: studentId, skill_slug: slug }, { onConflict: "student_id,skill_slug", ignoreDuplicates: true });
  fail(error);
}

export async function removeStudentSkill(studentId, slug) {
  if (isLocal) {
    const db = store();
    db.student_skills = db.student_skills.filter((k) => !(k.student_id === studentId && k.skill_slug === slug));
    return;
  }
  const supabase = await createClient();
  fail((await supabase.from("student_skills").delete().eq("student_id", studentId).eq("skill_slug", slug)).error);
}

export async function addProject(studentId, project) {
  if (isLocal) {
    store().portfolio_projects.push({ id: newId("p"), student_id: studentId, language: null, stars: 0, from_github: false, created_at: new Date().toISOString(), ...project });
    return;
  }
  const supabase = await createClient();
  fail((await supabase.from("portfolio_projects").insert({ student_id: studentId, ...project })).error);
}

export async function removeProject(studentId, projectId) {
  if (isLocal) {
    const db = store();
    db.portfolio_projects = db.portfolio_projects.filter((p) => !(p.id === projectId && p.student_id === studentId));
    return;
  }
  const supabase = await createClient();
  fail((await supabase.from("portfolio_projects").delete().eq("id", projectId).eq("student_id", studentId)).error);
}

/** Guarda la evidencia de GitHub: usuario, conteo por habilidad y repos destacados. */
export async function saveGitHubEvidence(studentId, { username, skills, projects }) {
  if (isLocal) {
    const db = store();
    db.students.find((s) => s.id === studentId).github_username = username;
    for (const k of db.student_skills.filter((k) => k.student_id === studentId)) k.evidence_count = 0;
    for (const s of skills) {
      const row = db.student_skills.find((k) => k.student_id === studentId && k.skill_slug === s.slug);
      if (row) row.evidence_count = s.evidence_count;
      else db.student_skills.push({ student_id: studentId, skill_slug: s.slug, evidence_count: s.evidence_count });
    }
    db.portfolio_projects = db.portfolio_projects.filter((p) => !(p.student_id === studentId && p.from_github));
    for (const p of projects) db.portfolio_projects.push({ id: newId("p"), student_id: studentId, created_at: new Date().toISOString(), ...p });
    return;
  }
  const supabase = await createClient();
  fail((await supabase.from("students").update({ github_username: username }).eq("id", studentId)).error);
  fail((await supabase.from("student_skills").update({ evidence_count: 0 }).eq("student_id", studentId)).error);
  if (skills.length) {
    fail((await supabase.from("student_skills").upsert(skills.map((s) => ({ student_id: studentId, skill_slug: s.slug, evidence_count: s.evidence_count })), { onConflict: "student_id,skill_slug" })).error);
  }
  fail((await supabase.from("portfolio_projects").delete().eq("student_id", studentId).eq("from_github", true)).error);
  if (projects.length) fail((await supabase.from("portfolio_projects").insert(projects.map((p) => ({ student_id: studentId, ...p })))).error);
}

export function resetLocalDemo() {
  if (isLocal) resetStore();
}
