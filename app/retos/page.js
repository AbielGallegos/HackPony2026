import Link from "next/link";
import { listChallenges, listApplications, getStudent } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { computeMatch } from "@/lib/matching.mjs";
import { isSkill, SKILL_OPTIONS } from "@/lib/skills.mjs";
import { ScoreBadge, MatchWhy, SkillChip, RequiredNote, EmptyState, mxn, timeAgo } from "@/components/ui";
import { ApplyButton } from "@/components/forms";

export const metadata = { title: "Retos · Puente Técnico" };

export default async function Retos({ searchParams }) {
  const sp = await searchParams;
  const user = await getUser();
  const isStudent = user?.role === "student";

  const [challenges, myApps, me] = await Promise.all([
    listChallenges({ onlyOpen: true }),
    isStudent ? listApplications({ studentId: user.id }) : [],
    isStudent ? getStudent(user.id) : null,
  ]);
  const appliedIds = new Set(myApps.map((a) => a.challenge_id));

  const vista = isStudent ? (sp.vista === "todos" ? "todos" : "recomendados") : "todos";
  const q = String(sp.q ?? "").toLowerCase().trim().slice(0, 80);
  const skill = isSkill(sp.skill) ? sp.skill : null;
  const orden = ["match", "reciente", "pago"].includes(sp.orden) ? sp.orden : isStudent ? "match" : "reciente";

  let rows = challenges.map((c) => ({ c, match: isStudent ? computeMatch(me?.skills ?? [], c.skills) : null }));
  const total = rows.length;

  // Filtro automático por coincidencia de habilidades (requisito oficial 2)
  if (vista === "recomendados") rows = rows.filter(({ match }) => match?.recommended);
  if (skill) rows = rows.filter(({ c }) => c.skills.some((s) => s.slug === skill));
  if (q) rows = rows.filter(({ c }) => `${c.title} ${c.description} ${c.company?.company_name} ${c.company?.city}`.toLowerCase().includes(q));

  rows.sort((a, b) => {
    if (orden === "pago") return b.c.reward_mxn - a.c.reward_mxn;
    if (orden === "match" && isStudent) return (b.match?.score ?? 0) - (a.match?.score ?? 0) || b.c.created_at.localeCompare(a.c.created_at);
    return b.c.created_at.localeCompare(a.c.created_at);
  });

  const link = (patch) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, skill: sp.skill, orden: sp.orden, vista: sp.vista, ...patch })) if (v) p.set(k, v);
    return `/retos?${p}`;
  };
  const profileEmpty = isStudent && (me?.skills?.length ?? 0) === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Micro-retos de empresas locales</h1>
          <p className="text-sm text-slate-500">
            {isStudent ? `Hola ${user.displayName.split(" ")[0]}, calculamos tu compatibilidad con cada reto.` : user ? "Vista de empresa: así ven los estudiantes el tablero." : "Inicia sesión como estudiante para ver tu % de compatibilidad."}
          </p>
        </div>
        {isStudent && (
          <div className="flex rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist" aria-label="Vista">
            {[["recomendados", "Recomendados"], ["todos", `Todos (${total})`]].map(([v, l]) => (
              <Link key={v} role="tab" aria-selected={vista === v} href={link({ vista: v === "recomendados" ? "" : v })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${vista === v ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {l}
              </Link>
            ))}
          </div>
        )}
      </div>

      {profileEmpty && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Aún no tienes habilidades en tu perfil, así que tu compatibilidad es 0%. <Link href="/perfil" className="font-semibold underline">Agrega al menos 3</Link> para ver tus retos recomendados.
        </div>
      )}

      <form className="card grid gap-2 p-3 sm:grid-cols-[1fr_200px_190px_auto]" action="/retos" role="search">
        {sp.vista && <input type="hidden" name="vista" value={sp.vista} />}
        <input name="q" defaultValue={sp.q ?? ""} className="input" placeholder="Buscar por reto, empresa o ciudad…" aria-label="Buscar" />
        <select name="skill" defaultValue={skill ?? ""} className="input" aria-label="Habilidad">
          <option value="">Cualquier habilidad</option>
          {SKILL_OPTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
        </select>
        <select name="orden" defaultValue={orden} className="input" aria-label="Ordenar">
          {isStudent && <option value="match">Mayor compatibilidad</option>}
          <option value="reciente">Más recientes</option>
          <option value="pago">Mejor pagados</option>
        </select>
        <button className="btn-primary">Filtrar</button>
      </form>

      {isStudent && vista === "recomendados" && (
        <p className="text-xs text-slate-500">Recomendados = cumples al menos el 75% de las habilidades obligatorias.</p>
      )}

      {rows.length === 0 ? (
        <EmptyState icon="🔍" title={vista === "recomendados" ? "Aún no hay retos recomendados para tu perfil" : "No hay retos con esos filtros"} href={vista === "recomendados" ? "/perfil" : "/retos"} cta={vista === "recomendados" ? "Completar mis habilidades" : "Ver todos"}>
          {vista === "recomendados" ? "Agrega más habilidades o revisa la pestaña Todos para ver qué te falta." : null}
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {rows.map(({ c, match }) => (
            <li key={c.id} className="card flex flex-col gap-4 p-5 sm:flex-row">
              {match && <ScoreBadge score={match.score} />}
              <div className="min-w-0 flex-1 space-y-2">
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{c.company?.company_name}</span>
                  <span>· {c.company?.city}</span>
                  <span>· {timeAgo(c.created_at)}</span>
                </p>
                <Link href={`/retos/${c.id}`} className="block text-lg font-bold hover:text-indigo-700">{c.title}</Link>
                <p className="line-clamp-2 text-sm text-slate-600">{c.description}</p>
                {match ? (
                  <>
                    <MatchWhy match={match} />
                    <RequiredNote match={match} />
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {c.skills.map((s) => <SkillChip key={s.slug} slug={s.slug} required={s.is_required ? undefined : false} />)}
                  </div>
                )}
              </div>
              <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{mxn(c.reward_mxn)}</p>
                  <p className="text-xs text-slate-500">{c.duration} · {c.modality}</p>
                </div>
                {isStudent ? <ApplyButton challengeId={c.id} applied={appliedIds.has(c.id)} /> : <Link href={`/retos/${c.id}`} className="btn-ghost">Ver reto</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
