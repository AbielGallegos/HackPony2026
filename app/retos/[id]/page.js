import Link from "next/link";
import { notFound } from "next/navigation";
import { getChallenge, listApplications, listStudents, getStudent } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { computeMatch, rankCandidates, WEIGHTS } from "@/lib/matching.mjs";
import { ScoreBadge, ScoreBar, MatchWhy, SkillChip, RequiredNote, Avatar, ChallengeState, EmptyState, mxn, timeAgo } from "@/components/ui";
import { ApplyButton, ApplicationStatusSelect, ChallengeStatusButton } from "@/components/forms";

function CandidateRow({ rank, student, match, app, challengeId }) {
  const firstLink = student.projects.find((p) => p.repo_url || p.demo_url);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rank === 1 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-600"}`} aria-label={`Lugar ${rank}`}>
        {rank}
      </span>
      <Avatar name={student.display_name} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/estudiantes/${student.id}`} className="font-semibold hover:text-indigo-700">{student.display_name}</Link>
          <span className="text-xs text-slate-500">
            {[student.university, student.semester && `${student.semester}° sem.`].filter(Boolean).join(" · ")}
            {app ? ` · se postuló ${timeAgo(app.created_at)}` : ""}
          </span>
        </div>
        <MatchWhy match={match} />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <RequiredNote match={match} />
          {match.evidenceMatches > 0 && <span className="text-emerald-700">{match.evidenceMatches} con evidencia en GitHub</span>}
          {firstLink && (
            <a href={firstLink.repo_url ?? firstLink.demo_url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
              Ver proyecto ↗
            </a>
          )}
        </div>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-52 sm:flex-col sm:items-stretch">
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-500">Compatibilidad</span>
            <span className="font-bold">{match.score}%</span>
          </div>
          <ScoreBar score={match.score} />
          {app && app.score_at_apply !== match.score && <p className="mt-1 text-[11px] text-slate-400">{app.score_at_apply}% al postularse</p>}
        </div>
        {app && <ApplicationStatusSelect applicationId={app.id} challengeId={challengeId} status={app.status} />}
      </div>
    </li>
  );
}

export default async function RetoDetalle({ params, searchParams }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const [challenge, user] = await Promise.all([getChallenge(id), getUser()]);
  if (!challenge) notFound();

  const isOwner = user?.role === "company" && user.id === challenge.company_id;
  const isStudent = user?.role === "student";

  let myMatch = null;
  let alreadyApplied = false;
  if (isStudent) {
    const [me, mine] = await Promise.all([getStudent(user.id), listApplications({ studentId: user.id, challengeId: id })]);
    myMatch = computeMatch(me?.skills ?? [], challenge.skills);
    alreadyApplied = mine.length > 0;
  }

  let candidates = [];
  let suggested = [];
  if (isOwner) {
    const [apps, students] = await Promise.all([listApplications({ challengeId: id }), listStudents()]);
    const byId = new Map(students.map((s) => [s.id, s]));
    // Mismo motor que ve el estudiante: el % se recalcula en el servidor con los datos actuales.
    candidates = rankCandidates(
      apps.filter((a) => byId.has(a.student_id)).map((a) => ({ student_id: a.student_id, applied_at: a.created_at, app: a, student: byId.get(a.student_id), match: computeMatch(byId.get(a.student_id).skills, challenge.skills) }))
    );
    const applied = new Set(apps.map((a) => a.student_id));
    suggested = rankCandidates(
      students.filter((s) => !applied.has(s.id)).map((s) => ({ student_id: s.id, student: s, match: computeMatch(s.skills, challenge.skills) })).filter((x) => x.match?.recommended)
    ).slice(0, 3);
  }

  const required = challenge.skills.filter((s) => s.is_required);
  const nice = challenge.skills.filter((s) => !s.is_required);

  return (
    <div className="space-y-6">
      <Link href={isOwner ? "/empresa" : "/retos"} className="text-sm text-slate-500 hover:text-slate-800">← Volver</Link>

      {nuevo && isOwner && (
        <div role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <b>Reto publicado.</b> Ya aparece en el tablero de los estudiantes. Abajo verás el talento compatible.
        </div>
      )}

      <section className="card flex flex-col gap-5 p-6 sm:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <b className="text-slate-700">{challenge.company?.company_name}</b> · {challenge.company?.sector} · {challenge.company?.city}
            <ChallengeState status={challenge.status} />
          </p>
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          {challenge.description && <p className="whitespace-pre-line text-slate-700">{challenge.description}</p>}
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div><dt className="inline text-slate-500">Pago: </dt><dd className="inline font-semibold">{mxn(challenge.reward_mxn)}</dd></div>
            <div><dt className="inline text-slate-500">Duración: </dt><dd className="inline">{challenge.duration}</dd></div>
            <div><dt className="inline text-slate-500">Modalidad: </dt><dd className="inline">{challenge.modality}</dd></div>
            <div><dt className="inline text-slate-500">Publicado: </dt><dd className="inline">{timeAgo(challenge.created_at)}</dd></div>
          </dl>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Obligatorias · {WEIGHTS.required}% del puntaje</p>
            <div className="flex flex-wrap gap-1.5">{required.map((s) => <SkillChip key={s.slug} slug={s.slug} />)}</div>
            {nice.length > 0 && (
              <>
                <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Deseables · {WEIGHTS.nice}% del puntaje</p>
                <div className="flex flex-wrap gap-1.5">{nice.map((s) => <SkillChip key={s.slug} slug={s.slug} />)}</div>
              </>
            )}
          </div>
        </div>

        {isStudent && myMatch && (
          <aside className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-5 sm:w-72" aria-label="Tu compatibilidad">
            <p className="text-sm font-semibold text-slate-600">Tu compatibilidad</p>
            <ScoreBadge score={myMatch.score} size="lg" />
            <p className="text-center text-xs text-slate-500">
              Obligatorias {myMatch.requiredMet}/{myMatch.requiredTotal}
              {myMatch.niceTotal > 0 && ` · Deseables ${myMatch.niceMet}/${myMatch.niceTotal}`}
            </p>
            <MatchWhy match={myMatch} />
            {myMatch.missing.length > 0 && (
              <p className="text-center text-xs text-slate-500">
                Para subir tu %: aprende o demuestra {myMatch.missing.map((m) => m.slug).length === 1 ? "la habilidad que falta" : "las habilidades que faltan"} y agrégala{myMatch.missing.length > 1 ? "s" : ""} en <Link href="/perfil" className="text-indigo-700 underline">tu perfil</Link>.
              </p>
            )}
            <ApplyButton challengeId={challenge.id} applied={alreadyApplied} disabledReason={challenge.status !== "open" && !alreadyApplied ? "Este reto ya no recibe postulaciones." : null} />
          </aside>
        )}

        {isOwner && (
          <aside className="flex flex-col items-end gap-2 sm:w-48">
            <ChallengeStatusButton challengeId={challenge.id} status={challenge.status} />
            <p className="text-right text-xs text-slate-500">{challenge.status === "open" ? "Al cerrarlo deja de recibir postulaciones." : "Cerrado: no recibe postulaciones."}</p>
          </aside>
        )}
      </section>

      {!user && (
        <EmptyState icon="🎓" title="¿Quieres saber tu compatibilidad?" href={`/login?next=/retos/${challenge.id}`} cta="Iniciar sesión">
          Inicia sesión como estudiante para ver tu porcentaje y postularte en un clic.
        </EmptyState>
      )}

      {isOwner && (
        <>
          <section className="card overflow-hidden" aria-label="Candidatos">
            <header className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="font-bold">Candidatos ordenados por compatibilidad</h2>
                <p className="text-xs text-slate-500">Desempate: obligatorias cumplidas → evidencia en GitHub → quién se postuló primero.</p>
              </div>
              <span className="text-sm font-semibold text-slate-500">{candidates.length}</span>
            </header>
            {candidates.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Aún no hay postulaciones. Comparte el reto o revisa el talento sugerido.</p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {candidates.map((x, i) => (
                  <CandidateRow key={x.student.id} rank={i + 1} student={x.student} match={x.match} app={x.app} challengeId={challenge.id} />
                ))}
              </ol>
            )}
          </section>

          {suggested.length > 0 && (
            <section className="card overflow-hidden" aria-label="Talento sugerido">
              <header className="border-b border-slate-200 p-4">
                <h2 className="font-bold">Talento sugerido que aún no se postula</h2>
                <p className="text-xs text-slate-500">Estudiantes que cumplen al menos el 75% de las obligatorias.</p>
              </header>
              <ol className="divide-y divide-slate-100">
                {suggested.map((x, i) => (
                  <CandidateRow key={x.student.id} rank={i + 1} student={x.student} match={x.match} challengeId={challenge.id} />
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {user?.role === "company" && !isOwner && <p className="text-sm text-slate-500">Solo {challenge.company?.company_name} puede ver los candidatos de este reto.</p>}
    </div>
  );
}
