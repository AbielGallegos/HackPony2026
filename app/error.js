"use client";

export default function Error({ error, reset }) {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-4xl">⚠️</p>
      <h1 className="mt-2 text-xl font-bold">Algo salió mal</h1>
      <p className="mt-1 text-sm text-slate-500">{error?.message}</p>
      <button onClick={reset} className="btn-primary mt-4">Reintentar</button>
    </div>
  );
}
