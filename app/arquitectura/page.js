import { WEIGHTS, RECOMMENDED_REQUIRED_RATIO } from "@/lib/matching.mjs";
import { DATA_MODE } from "@/lib/mode.mjs";

export const metadata = { title: "Arquitectura · NextPoint" };

const Box = ({ title, children, tone = "bg-surface" }) => (
  <div className={`rounded-2xl border border-slate-200 p-4 ${tone}`}>
    <p className="font-bold">{title}</p>
    <div className="mt-1 text-sm text-slate-600">{children}</div>
  </div>
);
const Arrow = ({ label }) => (
  <div className="flex flex-col items-center py-1 text-xs text-slate-500" aria-hidden="true">
    <span>{label}</span>
    <span className="text-lg leading-none">↓</span>
  </div>
);

export default function Arquitectura() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Arquitectura técnica</h1>
        <p className="text-sm text-slate-500">Toda escritura pasa por el servidor, y la base de datos la vuelve a validar con RLS.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <Box title="Navegador (estudiante / empresa)" tone="bg-indigo-50">React 19 · Tailwind CSS · celular y escritorio</Box>
          <Arrow label="cada petición" />
          <Box title="proxy.js (Next.js 16)">Refresca la sesión de Supabase y protege /perfil, /empresa y /estudiantes</Box>
          <Arrow label="Server Components leen · Server Actions escriben" />
          <Box title="Next.js 16 · App Router (Vercel)">
            <ul className="list-disc pl-5">
              <li><code>lib/matching</code> — % de compatibilidad (función pura)</li>
              <li><code>lib/auth</code> — getUser / requireRole en cada acción</li>
              <li><code>lib/validation</code> — validación de entradas</li>
              <li><code>lib/queries</code> — acceso a datos con la sesión del usuario</li>
            </ul>
          </Box>
          <div className="grid grid-cols-2 gap-3">
            <div><Arrow label="SQL + RLS" /><Box title="Supabase" tone="bg-emerald-50">Auth + Postgres · 9 tablas · políticas por rol y propietario</Box></div>
            <div><Arrow label="REST (opcional)" /><Box title="API de GitHub" tone="bg-slate-50">Repos públicos → evidencia por habilidad</Box></div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Modo de datos actual: <b>{DATA_MODE}</b>.</p>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-bold">SkillMatch: compatibilidad explicable</h2>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">{`compat = ${WEIGHTS.required} × (obligatorias cumplidas / obligatorias)
       + ${WEIGHTS.nice} × (deseables cumplidas / deseables)

sin deseables → 100 × (obligatorias cumplidas / obligatorias)
recomendado  → cumple ≥ ${RECOMMENDED_REQUIRED_RATIO * 100}% de las obligatorias`}</pre>
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold">Ejemplo: panel de inventario</p>
            <p className="text-slate-600">Obligatorias: JavaScript, React, SQL, Git · sin deseables</p>
            <p className="text-slate-600">El estudiante tiene JavaScript, React y Git → 3/4 → <b>75%</b> · le falta SQL</p>
          </div>
          <h3 className="font-semibold">Desempate (determinista)</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>% de mayor a menor</li>
            <li>Obligatorias cumplidas</li>
            <li>Habilidades con evidencia en GitHub (no cambia el %, solo desempata)</li>
            <li>Quién se postuló primero</li>
          </ol>
          <h3 className="font-semibold">Seguridad</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>El % se calcula en el servidor; el navegador solo envía el id del reto.</li>
            <li>RLS: una empresa solo ve postulaciones de sus retos; nadie se postula en nombre de otro.</li>
            <li>El rol no se puede cambiar (permiso por columna) y la postulación es única por reto.</li>
            <li>Pruebas: 12 de matching (<code>npm test</code>) y 35 de acceso cruzado (<code>supabase/tests</code>).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
