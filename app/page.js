import Link from "next/link";
import { getStats } from "@/lib/queries.mjs";
import { getUser } from "@/lib/auth.mjs";
import { mxn } from "@/components/ui";

export default async function Home() {
  const [stats, user] = await Promise.all([getStats(), getUser()]);
  const primary = user ? (user.role === "company" ? ["/empresa", "Ir a mi empresa →"] : ["/retos", "Ver mis retos compatibles →"]) : null;

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Hecho en Morelia, Michoacán</p>
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Tu primera experiencia laboral no debería requerir experiencia.</h1>
        <p className="mt-4 max-w-2xl text-indigo-100 sm:text-lg">
          Empresas locales publican <b>micro-retos reales</b>. Estudiantes de TI se postulan en un clic y ven al instante su{" "}
          <b>% de compatibilidad</b>: qué habilidades tienen y cuáles les faltan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {primary ? (
            <Link href={primary[0]} className="btn bg-white text-indigo-700 hover:bg-indigo-50">{primary[1]}</Link>
          ) : (
            <>
              <Link href="/registro" className="btn bg-white text-indigo-700 hover:bg-indigo-50">Soy estudiante →</Link>
              <Link href="/registro?rol=company" className="btn border border-white/40 text-white hover:bg-white/10">Soy empresa →</Link>
              <Link href="/retos" className="btn text-indigo-100 underline-offset-4 hover:underline">Explorar retos</Link>
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Cifras de la plataforma">
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
      </section>

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
