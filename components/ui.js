// Componentes visuales sin estado (dueña: Azul).
import Link from "next/link";
import { scoreTone } from "@/lib/matching.mjs";
import { skillLabel } from "@/lib/skills.mjs";

const GH = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3 fill-current">
    <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

/** tone: "match" (la tiene), "missing" (le falta) o "plain". evidence > 0 añade el ícono de GitHub. */
export function SkillChip({ slug, tone = "plain", evidence = 0, required }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1";
  const req = required === false ? <span className="opacity-60">(deseable)</span> : null;
  if (tone === "missing")
    return <span className={`${base} bg-rose-50 text-rose-700 ring-rose-200`}>✕ {skillLabel(slug)} {req}</span>;
  if (tone === "match")
    return (
      <span className={`${base} bg-emerald-50 text-emerald-800 ring-emerald-200`} title={evidence ? `Con evidencia en ${evidence} repositorio(s) públicos` : "Declarada por el estudiante"}>
        ✓ {skillLabel(slug)} {evidence ? <GH /> : null} {req}
      </span>
    );
  return (
    <span className={`${base} bg-slate-50 text-slate-700 ring-slate-200`} title={evidence ? `Con evidencia en ${evidence} repositorio(s) públicos` : "Declarada"}>
      {skillLabel(slug)}
      {evidence ? (
        <span className="inline-flex items-center gap-0.5 text-emerald-700">
          <GH />
          {evidence}
        </span>
      ) : null}
    </span>
  );
}

export function ScoreBadge({ score, size = "md" }) {
  const t = scoreTone(score);
  const big = size === "lg";
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-2xl ${t.bg} ring-1 ${t.ring} ${big ? "h-20 w-20" : "h-16 w-16"}`}>
      <span className={`${t.text} font-bold leading-none ${big ? "text-2xl" : "text-xl"}`}>{score}%</span>
      <span className={`${t.text} mt-1 text-[10px] font-semibold uppercase tracking-wide`}>{t.label}</span>
    </div>
  );
}

export function ScoreBar({ score }) {
  const t = scoreTone(score);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full ${t.bar}`} style={{ width: `${score}%` }} />
    </div>
  );
}

/** Explica el porqué del %: qué tiene (✓) y qué le falta (✕). */
export function MatchWhy({ match }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {match.matched.map((m) => (
        <SkillChip key={m.slug} slug={m.slug} tone="match" evidence={m.has_evidence ? 1 : 0} required={m.is_required ? undefined : false} />
      ))}
      {match.missing.map((m) => (
        <SkillChip key={m.slug} slug={m.slug} tone="missing" required={m.is_required ? undefined : false} />
      ))}
    </div>
  );
}

export function RequiredNote({ match }) {
  if (match.meetsAllRequired) return <p className="text-xs font-medium text-emerald-700">Cumple todas las obligatorias</p>;
  const n = match.requiredTotal - match.requiredMet;
  return <p className="text-xs font-medium text-rose-600">Le falta{n > 1 ? "n" : ""} {n} obligatoria{n > 1 ? "s" : ""}</p>;
}

export function Avatar({ name, size = 44 }) {
  const initials = (name || "?").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700" style={{ width: size, height: size, fontSize: size / 2.6 }} aria-hidden="true">
      {initials}
    </div>
  );
}

const APP_STATUS = {
  postulado: ["Postulado", "bg-slate-100 text-slate-700"],
  en_revision: ["En revisión", "bg-amber-100 text-amber-800"],
  seleccionado: ["Seleccionado", "bg-emerald-100 text-emerald-800"],
  descartado: ["Descartado", "bg-rose-100 text-rose-700"],
};
export const APP_STATUS_OPTIONS = Object.entries(APP_STATUS).map(([value, [label]]) => ({ value, label }));

export function StatusPill({ status }) {
  const [label, cls] = APP_STATUS[status] ?? [status, "bg-slate-100 text-slate-700"];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export function ChallengeState({ status }) {
  return status === "open" ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Abierto</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">Cerrado</span>
  );
}

export function EmptyState({ icon = "🗂️", title, children, href, cta }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <p className="font-semibold text-slate-800">{title}</p>
      {children && <p className="max-w-md text-sm text-slate-500">{children}</p>}
      {href && <Link href={href} className="btn-primary mt-2">{cta}</Link>}
    </div>
  );
}

export const mxn = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);

export function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}
