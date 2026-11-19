// Vista del portafolio del estudiante (pública para usuarios con sesión y editable en /perfil).
import { SkillChip, Avatar } from "@/components/ui";
import { skillLabel } from "@/lib/skills.mjs";
import { RemoveSkillButton, RemoveProjectButton } from "@/components/forms";

export function ProfileHeader({ student }) {
  const meta = [student.career, student.university, student.semester && `${student.semester}° semestre`, student.city].filter(Boolean).join(" · ");
  return (
    <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
      <Avatar name={student.display_name} size={72} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{student.display_name}</h1>
          {student.github_username && (
            <a href={`https://github.com/${student.github_username}`} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              GitHub · @{student.github_username} ↗
            </a>
          )}
        </div>
        {meta && <p className="text-sm text-slate-600">{meta}</p>}
        {student.bio && <p className="mt-2 text-sm text-slate-700">{student.bio}</p>}
      </div>
    </section>
  );
}

export function SkillsSection({ student, editable, children }) {
  const skills = [...student.skills].sort((a, b) => b.evidence_count - a.evidence_count || skillLabel(a.slug).localeCompare(skillLabel(b.slug)));
  const withEvidence = skills.filter((s) => s.evidence_count > 0).length;
  return (
    <section className="card p-6" aria-label="Habilidades">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Habilidades técnicas</h2>
        <span className="text-xs text-slate-500">{skills.length} declaradas · {withEvidence} con evidencia en GitHub</span>
      </div>
      {skills.length === 0 ? (
        <p className="text-sm text-slate-500">{editable ? "Aún no agregas habilidades. Sin ellas tu compatibilidad es 0%." : "Sin habilidades registradas."}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <li key={s.slug} className="inline-flex items-center">
              <SkillChip slug={s.slug} evidence={s.evidence_count} />
              {editable && <RemoveSkillButton slug={s.slug} label={skillLabel(s.slug)} />}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-400">El ícono de GitHub indica en cuántos repositorios públicos aparece la tecnología. Es evidencia, no una certificación.</p>
      {children}
    </section>
  );
}

export function ProjectsSection({ student, editable, children }) {
  return (
    <section className="card p-6" aria-label="Proyectos">
      <h2 className="mb-4 font-bold">Proyectos y repositorios</h2>
      {student.projects.length === 0 && <p className="mb-3 text-sm text-slate-500">{editable ? "Agrega un proyecto con enlace para que las empresas vean tu trabajo." : "Sin proyectos todavía."}</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {student.projects.map((p) => (
          <li key={p.id} className="flex flex-col rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{p.title}</span>
              {p.from_github && <span className="shrink-0 text-[11px] font-semibold text-emerald-700">desde GitHub</span>}
            </div>
            {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs">
              {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 hover:underline">Repositorio ↗</a>}
              {p.demo_url && <a href={p.demo_url} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 hover:underline">Demo ↗</a>}
              {p.language && <span className="text-slate-500">{p.language}</span>}
              {p.stars > 0 && <span className="text-slate-500">★ {p.stars}</span>}
              {editable && <span className="ml-auto"><RemoveProjectButton projectId={p.id} /></span>}
            </div>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
