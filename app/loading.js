// Indicador de carga mientras el servidor prepara la página (útil en redes móviles lentas).
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true" />
      Cargando…
    </div>
  );
}
