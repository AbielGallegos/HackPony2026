import Link from "next/link";
import { redirect } from "next/navigation";
import { listChallenges, listApplications, getCompany } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { ChallengeState, EmptyState, mxn, timeAgo } from "@/components/ui";
import { ChallengeForm } from "@/components/forms";

export const metadata = { title: "Mi empresa · NextPoint" };

export default async function Empresa() {
  const user = await getUser();
  if (!user) redirect("/login?next=/empresa");
  if (user.role !== "company") redirect("/perfil");

  const [company, mine, apps] = await Promise.all([getCompany(user.id), listChallenges({ companyId: user.id }), listApplications()]);
  // RLS ya limita "apps" a las postulaciones de mis retos.
  const count = (cid) => apps.filter((a) => a.challenge_id === cid).length;
  const best = (cid) => Math.max(-1, ...apps.filter((a) => a.challenge_id === cid).map((a) => a.score_at_apply));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{company?.company_name ?? user.displayName}</h1>
        <p className="text-sm text-slate-500">{[company?.sector, company?.city].filter(Boolean).join(" · ") || "Empresa"}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="space-y-3" aria-label="Mis retos">
          <h2 className="font-bold">Mis retos publicados</h2>
          {mine.length === 0 && <EmptyState icon="📌" title="Aún no publicas retos">Publica tu primer micro-reto con el formulario y verás al instante el talento compatible.</EmptyState>}
          {mine.map((c) => {
            const n = count(c.id);
            const b = best(c.id);
            return (
              <Link key={c.id} href={`/retos/${c.id}`} className="card block p-4 hover:border-indigo-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">{c.title} <ChallengeState status={c.status} /></p>
                    <p className="text-xs text-slate-500">{mxn(c.reward_mxn)} · {c.duration} · publicado {timeAgo(c.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{n}</p>
                    <p className="text-xs text-slate-500">{n === 1 ? "candidato" : "candidatos"}</p>
                  </div>
                </div>
                {b >= 0 && <p className="mt-2 text-xs font-medium text-emerald-700">Mejor compatibilidad al postularse: {b}% → ver ranking</p>}
              </Link>
            );
          })}
        </section>

        <section className="card p-6" aria-label="Publicar reto">
          <h2 className="mb-1 font-bold">Publicar un micro-reto</h2>
          <p className="mb-4 text-sm text-slate-500">Un problema real y acotado (1 a 4 semanas). Elige qué es indispensable y qué es deseable.</p>
          <ChallengeForm />
        </section>
      </div>
    </div>
  );
}
