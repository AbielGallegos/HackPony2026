import { BRAND } from "@/lib/brand.mjs";
import { InstallHelp } from "@/components/InstallHelp";

export const metadata = { title: `Instalar ${BRAND.shortName}` };

const Step = ({ n, children }) => (
  <li className="flex gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{n}</span>
    <span className="pt-0.5">{children}</span>
  </li>
);

export default function Instalar() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Instala {BRAND.shortName} en tu celular</h1>
        <p className="text-sm text-slate-500">Es la misma plataforma web: se abre desde un ícono, a pantalla completa. No ocupa espacio de una app de tienda.</p>
      </div>
      <section className="card p-5"><InstallHelp /></section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-5" aria-label="Android">
          <h2 className="mb-3 font-bold">Android (Chrome)</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <Step n={1}>Abre este sitio en <b>Chrome</b>.</Step>
            <Step n={2}>Toca el menú <b>⋮</b> (arriba a la derecha).</Step>
            <Step n={3}>Elige <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</Step>
          </ol>
        </section>
        <section className="card p-5" aria-label="iPhone">
          <h2 className="mb-3 font-bold">iPhone (Safari)</h2>
          <ol className="space-y-3 text-sm text-slate-700">
            <Step n={1}>Abre este sitio en <b>Safari</b>.</Step>
            <Step n={2}>Toca <b>Compartir</b> (el cuadro con la flecha hacia arriba).</Step>
            <Step n={3}>Elige <b>Agregar a inicio</b> y luego <b>Agregar</b>.</Step>
          </ol>
        </section>
      </div>
      <p className="rounded-xl bg-slate-100 p-4 text-xs text-slate-600">
        <b>Sesión:</b> en iPhone, la app instalada guarda su sesión aparte de Safari, así que tendrás que iniciar sesión una vez dentro de la app. Por seguridad no se guardan páginas privadas sin conexión: necesitas internet para usarla.
      </p>
    </div>
  );
}
