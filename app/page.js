import Link from "next/link";
import { getStats } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { mxn } from "@/components/ui";

export default async function Home() {
  const [stats, user] = await Promise.all([getStats(), getUser()]);
  const primary = user ? (user.role === "company" ? ["/empresa", "Ir a mi empresa →"] : ["/retos", "Ver mis retos compatibles →"]) : null;

  return (
    <div className="space-y-10">
      <section className="bg-grid relative overflow-hidden rounded-3xl border border-slate-200 bg-surface px-6 py-12 sm:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 font-mono text-xs text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_8px_var(--color-neon)]" aria-hidden="true" />
              Hecho en Morelia, Michoacán
            </p>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Tu primera experiencia laboral <span className="text-neon">no debería requerir experiencia.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-slate-600 sm:text-lg">
              Empresas locales publican <b className="text-slate-900">micro-retos reales</b>. Estudiantes de TI se postulan en un clic y ven al instante su{" "}
              <b className="text-slate-900">% de compatibilidad</b>: qué habilidades tienen y cuáles les faltan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {primary ? (
                <Link href={primary[0]} className="btn-primary">{primary[1]}</Link>
              ) : (
                <>
                  <Link href="/registro" className="btn-primary">Soy estudiante →</Link>
                  <Link href="/registro?rol=company" className="btn-ghost">Soy empresa →</Link>
                  <Link href="/retos" className="btn text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">Explorar retos</Link>
                </>
              )}
            </div>
          </div>

          {/* Ejemplo ilustrativo de cómo se explica el %: no son datos de un usuario real. */}
          <figure className="rounded-2xl border border-slate-200 bg-bg/70 p-5 font-mono text-sm shadow-2xl shadow-black/40" aria-label="Ejemplo de cálculo SkillMatch">
            <figcaption className="mb-4 flex items-center justify-between text-xs text-slate-500">
              <span>skillmatch · ejemplo</span>
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-700/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-700/70" />
              </span>
            </figcaption>
            <p className="text-slate-500">Reto: Panel de inventario</p>
            <ul className="mt-3 space-y-1.5">
              <li className="text-emerald-700">✓ JavaScript <span className="text-slate-400">obligatoria</span></li>
              <li className="text-emerald-700">✓ React <span className="text-slate-400">obligatoria</span></li>
              <li className="text-emerald-700">✓ Git <span className="text-slate-400">obligatoria</span></li>
              <li className="text-rose-600">✕ SQL <span className="text-slate-400">obligatoria</span></li>
            </ul>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-slate-500">3 de 4 obligatorias · sin deseables ⇒ <span className="text-slate-900">100 × 3/4</span></p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-3/4 rounded-full bg-neon shadow-[0_0_12px_var(--color-neon)]" />
                </div>
                <span className="text-lg font-bold text-neon">75%</span>
              </div>
            </div>
          </figure>
        </div>
      </section>

      {stats && <section className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Cifras de la plataforma">
        {[
          [stats.challenges, "micro-retos abiertos"],
          [stats.companies, "empresas"],
          [stats.students, "estudiantes"],
          [mxn(stats.reward_mxn), "en pagos ofrecidos"],
        ].map(([n, l]) => (
          <div key={l} className="card p-5">
            <p className="text-2xl font-bold text-slate-900">{n}</p>
            <p className="text-sm text-slate-500">{l}</p>
          </div>
        ))}
      </section>}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold">El círculo de la falta de experiencia</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            <li><b>8 de cada 10</b> jóvenes de 18 a 29 años en México tienen dificultades para encontrar empleo; la principal causa es la <b>falta de experiencia (60%)</b>.</li>
            <li>Las PyMEs tienen problemas concretos de software, pero no pueden pagar una agencia ni contratar sin evidencia.</li>
            <li>Un micro-reto resuelve las dos cosas: la empresa prueba talento con poco riesgo y el estudiante gana experiencia comprobable.</li>
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            Fuente: Estudio Talento Joven y Empresas, ManpowerGroup y Junior Achievement Américas (2025), vía{" "}
            <a className="underline" href="https://www.publimetro.com.mx/noticias/2025/08/15/jovenes-sin-empleo-y-empresas-sin-talento-quien-tiene-la-culpa/" target="_blank" rel="noreferrer">Publimetro</a>.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold">Cómo funciona</h2>
          <ol className="mt-3 space-y-3 text-sm text-slate-700">
            <li><b>1. Perfil con evidencia.</b> Habilidades del catálogo, proyectos con enlaces y, opcional, evidencia de repos públicos de GitHub.</li>
            <li><b>2. Matching explicable.</b> 80% obligatorias + 20% deseables. Siempre ves qué tienes y qué te falta.</li>
            <li><b>3. Postulación en un clic.</b> Sin duplicados, guardada en la base de datos.</li>
            <li><b>4. Ranking para la empresa.</b> Candidatos ordenados por compatibilidad, con su portafolio a un clic.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
