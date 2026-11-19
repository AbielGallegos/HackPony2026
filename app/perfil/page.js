import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudent, listApplications, listChallenges } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { computeMatch } from "@/lib/matching.mjs";
import { ScoreBar, StatusPill, ChallengeState, timeAgo } from "@/components/ui";
import { ProfileHeader, SkillsSection, ProjectsSection } from "@/components/StudentProfileView";
import { ProfileForm, AddSkillForm, AddProjectForm, GitHubForm } from "@/components/forms";

export const metadata = { title: "Mi perfil · NextPoint" };

function Progress({ student }) {
  const steps = [
    ["Datos básicos", Boolean(student.university && student.career)],
    ["Descripción", Boolean(student.bio)],
    ["3 o más habilidades", student.skills.length >= 3],
    ["Un proyecto con enlace", student.projects.some((p) => p.repo_url || p.demo_url)],
    ["Evidencia de GitHub", Boolean(student.github_username)],
  ];
  const done = steps.filter(([, ok]) => ok).length;
  return (
    <section className="card p-5" aria-label="Avance del perfil">
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-semibold">Perfil completo</span>
        <span className="font-bold">{done}/5</span>
      </div>
      <ScoreBar score={done * 20} />
      <ul className="mt-3 space-y-1 text-sm">
        {steps.map(([label, ok]) => (
          <li key={label} className={ok ? "text-emerald-700" : "text-slate-500"}>{ok ? "✓" : "○"} {label}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function MiPerfil({ searchParams }) {
  const { bienvenida } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?next=/perfil");
  if (user.role !== "student") redirect("/empresa");

  const [student, apps, challenges] = await Promise.all([getStudent(user.id), listApplications({ studentId: user.id }), listChallenges()]);
  const byId = new Map(challenges.map((c) => [c.id, c]));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {bienvenida && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            ¡Bienvenida/o! Completa tu perfil y agrega habilidades para ver tus retos compatibles.
          </p>
        )}
        <ProfileHeader student={student} />
        <section className="card p-6" aria-label="Datos básicos">
          <h2 className="mb-4 font-bold">Datos básicos</h2>
          <ProfileForm student={student} />
        </section>
        <SkillsSection student={student} editable>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <AddSkillForm owned={student.skills.map((s) => s.slug)} />
          </div>
        </SkillsSection>
        <ProjectsSection student={student} editable>
          <div className="mt-4">
            <AddProjectForm />
          </div>
        </ProjectsSection>
      </div>

      <aside className="space-y-6">
        <Progress student={student} />
        <section className="card p-5" aria-label="Evidencia de GitHub">
          <h2 className="font-bold">Evidencia en GitHub</h2>
          <p className="mb-3 mt-1 text-sm text-slate-600">
            Revisamos tus repositorios públicos y contamos en cuántos aparece cada tecnología. No cambia tu %; ayuda a desempatar y la empresa puede abrir tus repos.
          </p>
          <GitHubForm defaultUser={student.github_username} />
        </section>
        <section className="card p-5" aria-label="Mis postulaciones">
          <h2 className="mb-3 font-bold">Mis postulaciones</h2>
          {apps.length === 0 && (
            <p className="text-sm text-slate-500">
              Aún no te postulas. <Link href="/retos" className="text-indigo-700 underline">Explorar retos</Link>
            </p>
          )}
          <ul className="space-y-3">
            {apps.map((a) => {
              const c = byId.get(a.challenge_id);
              if (!c) return null;
              const m = computeMatch(student.skills, c.skills);
              return (
                <li key={a.id}>
                  <Link href={`/retos/${c.id}`} className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{c.title}</p>
                      <StatusPill status={a.status} />
                    </div>
                    <p className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                      {c.company?.company_name} · {timeAgo(a.created_at)} <ChallengeState status={c.status} />
                    </p>
                    <div className="flex items-center gap-2">
                      <ScoreBar score={m?.score ?? 0} />
                      <span className="text-xs font-bold">{m?.score ?? 0}%</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
