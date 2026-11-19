// Modo local de DESARROLLO (solo con ALLOW_LOCAL_MODE=1 y npm run dev). Sesiones simuladas, sin RLS.
// Imita las mismas tablas y restricciones en memoria. Se reinicia al reiniciar el servidor.
// No es el sistema real ni sirve para la demo: el pie de página lo indica en rojo.
import * as demo from "./demo-data.mjs";
import { computeMatch } from "./matching.mjs";

function fresh() {
  const profiles = [
    ...demo.students.map((s) => ({ id: s.key, role: "student", display_name: s.display_name, email: s.email })),
    ...demo.companies.map((c) => ({ id: c.key, role: "company", display_name: c.company_name, email: c.email })),
  ];
  const students = demo.students.map(({ key, university, career, semester, city, bio, github_username }) => ({ id: key, university, career, semester, city, bio, github_username }));
  const companies = demo.companies.map(({ key, company_name, sector, city, description, website_url }) => ({ id: key, company_name, sector, city, description, website_url }));
  const student_skills = demo.students.flatMap((s) => s.skills.map((k) => ({ student_id: s.key, skill_slug: k.slug, evidence_count: k.evidence_count })));
  const portfolio_projects = demo.students.flatMap((s) =>
    s.projects.map((p, i) => ({ id: `${s.key}-p${i}`, student_id: s.key, title: p.title, description: p.description ?? null, repo_url: p.repo_url ?? null, demo_url: null, language: null, stars: 0, from_github: false, created_at: "2026-11-01T00:00:00Z" }))
  );
  const challenges = demo.challenges.map((c) => ({ id: c.key, company_id: c.company, title: c.title, description: c.description, status: c.status, reward_mxn: c.reward_mxn, duration: c.duration, modality: c.modality, created_at: c.created_at }));
  const challenge_skills = demo.challenges.flatMap((c) => [
    ...c.required.map((slug) => ({ challenge_id: c.key, skill_slug: slug, is_required: true })),
    ...c.nice.map((slug) => ({ challenge_id: c.key, skill_slug: slug, is_required: false })),
  ]);
  const score = (studentKey, challengeKey) =>
    computeMatch(
      student_skills.filter((k) => k.student_id === studentKey).map((k) => ({ slug: k.skill_slug, evidence_count: k.evidence_count })),
      challenge_skills.filter((k) => k.challenge_id === challengeKey).map((k) => ({ slug: k.skill_slug, is_required: k.is_required }))
    )?.score ?? 0;
  const applications = demo.applications.map((a, i) => ({ id: `a${i + 1}`, challenge_id: a.challenge, student_id: a.student, status: a.status, score_at_apply: score(a.student, a.challenge), created_at: a.created_at }));
  return { profiles, students, companies, student_skills, portfolio_projects, challenges, challenge_skills, applications };
}

export function store() {
  globalThis.__ptLocal ??= fresh();
  return globalThis.__ptLocal;
}

export function resetStore() {
  globalThis.__ptLocal = fresh();
}

export const newId = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
