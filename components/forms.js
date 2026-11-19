"use client";
// Componentes interactivos que llaman Server Actions (dueña: Azul).
import { useActionState, useEffect, useRef, useState, useTransition, startTransition } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { updateProfile, addSkill, removeSkill, addProject, removeProject, syncGitHub } from "@/app/actions/profile";
import { createChallenge, setChallengeStatus } from "@/app/actions/challenges";
import { applyToChallenge, setApplicationStatus } from "@/app/actions/applications";
import { SKILL_OPTIONS } from "@/lib/skills.mjs";
import { APP_STATUS_OPTIONS } from "@/components/ui";

// React 19 vacía el formulario al usar action={...}. Con onSubmit conservamos lo escrito si hay error.
function useFormAction(fn, { resetOnSuccess = false } = {}) {
  const [state, dispatch, pending] = useActionState(fn, null);
  const ref = useRef(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, e.nativeEvent.submitter ?? undefined);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending, ref];
}

const Msg = ({ state }) =>
  state?.error ? (
    <p role="alert" className="text-sm text-rose-600">{state.error}</p>
  ) : state?.message ? (
    <p role="status" className="text-sm font-medium text-emerald-700">{state.message}</p>
  ) : null;

// ---------------- acceso ----------------
export function LoginForm({ next, demoAccounts, local }) {
  const [state, onSubmit, pending] = useFormAction(signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (local)
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />
        <Msg state={state} />
        <div className="grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((a) => (
            <button key={a.id} name="demo" value={a.id} disabled={pending} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50">
              <span className="font-semibold">{a.name}</span>
              <span className="text-xs text-slate-500">{a.role === "student" ? "Estudiante" : "Empresa"}</span>
            </button>
          ))}
        </div>
      </form>
    );

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Msg state={state} />
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Entrando…" : "Iniciar sesión"}</button>
      </form>
      {demoAccounts?.length > 0 && (
        <details className="rounded-xl bg-slate-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-slate-700">Cuentas de demostración</summary>
          <p className="mt-2 text-xs text-slate-500">Toca una para llenar el correo. La contraseña la tiene quien presenta la demo.</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {demoAccounts.map((a) => (
              <button key={a.email} type="button" onClick={() => setEmail(a.email)} className="rounded-lg border border-slate-200 bg-surface px-3 py-2 text-left text-xs hover:border-indigo-300">
                <b>{a.name}</b> · {a.role === "student" ? "Estudiante" : "Empresa"}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function SignUpForm({ defaultRole = "student" }) {
  const [state, onSubmit, pending] = useFormAction(signUp);
  const [role, setRole] = useState(defaultRole === "company" ? "company" : "student");
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <fieldset>
        <legend className="label">Tipo de cuenta</legend>
        <div className="grid grid-cols-2 gap-2">
          {[["student", "🎓 Soy estudiante"], ["company", "🏢 Soy empresa"]].map(([v, l]) => (
            <label key={v} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold ${role === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}>
              <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">El tipo de cuenta no se puede cambiar después.</p>
      </fieldset>
      <div>
        <label className="label" htmlFor="display_name">{role === "company" ? "Nombre de la empresa" : "Tu nombre"}</label>
        <input id="display_name" name="display_name" required minLength={2} maxLength={80} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <Msg state={state} />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}</button>
    </form>
  );
}

// ---------------- postulación ----------------
export function ApplyButton({ challengeId, applied: initiallyApplied, disabledReason }) {
  const [applied, setApplied] = useState(initiallyApplied);
  const [error, setError] = useState(null);
  const [pending, start] = useTransition();

  if (disabledReason) return <span className="text-right text-xs text-slate-500">{disabledReason}</span>;
  if (applied) return <span className="btn bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">✓ Ya te postulaste</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await applyToChallenge(challengeId);
            if (res.ok) setApplied(true);
            else setError(res.error);
          })
        }
      >
        {pending ? "Enviando…" : "Postularme ⚡"}
      </button>
      {error && <span role="alert" className="max-w-[220px] text-right text-xs text-rose-600">{error}</span>}
    </div>
  );
}

export function ApplicationStatusSelect({ applicationId, challengeId, status }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  return (
    <div className="flex flex-col gap-0.5">
      <select
        aria-label="Estado de la postulación"
        className="min-h-11 rounded-lg border border-slate-300 bg-surface px-2 py-1 text-base sm:min-h-0 sm:text-xs"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          const prev = value;
          setValue(v);
          start(async () => {
            const res = await setApplicationStatus(applicationId, v, challengeId);
            if (!res.ok) { setValue(prev); setError(res.error); } else setError(null);
          });
        }}
      >
        {APP_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}

export function ChallengeStatusButton({ challengeId, status }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  const next = status === "open" ? "closed" : "open";
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className={status === "open" ? "btn-ghost" : "btn-primary"}
        disabled={pending}
        onClick={() => start(async () => { const r = await setChallengeStatus(challengeId, next); setError(r.ok ? null : r.error); })}
      >
        {pending ? "Guardando…" : status === "open" ? "Cerrar reto" : "Reabrir reto"}
      </button>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

// ---------------- perfil ----------------
export function ProfileForm({ student }) {
  const [state, onSubmit, pending] = useFormAction(updateProfile);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="display_name">Nombre</label>
        <input id="display_name" name="display_name" defaultValue={student.display_name} required minLength={2} maxLength={80} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="university">Universidad</label>
        <input id="university" name="university" defaultValue={student.university ?? ""} maxLength={120} className="input" placeholder="Tecnológico de Morelia" />
      </div>
      <div>
        <label className="label" htmlFor="career">Carrera</label>
        <input id="career" name="career" defaultValue={student.career ?? ""} maxLength={120} className="input" placeholder="Ing. en Sistemas Computacionales" />
      </div>
      <div>
        <label className="label" htmlFor="semester">Semestre</label>
        <input id="semester" name="semester" type="number" min={1} max={14} defaultValue={student.semester ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="city">Ciudad</label>
        <input id="city" name="city" defaultValue={student.city ?? ""} maxLength={80} className="input" placeholder="Morelia" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="bio">Sobre mí</label>
        <textarea id="bio" name="bio" rows={3} maxLength={500} defaultValue={student.bio ?? ""} className="input" placeholder="¿Qué te gusta construir? ¿Qué buscas?" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar perfil"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function AddSkillForm({ owned }) {
  const [state, action, pending] = useActionState(addSkill, null);
  const options = SKILL_OPTIONS.filter((s) => !owned.includes(s.slug));
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <select name="skill" className="input max-w-[240px]" defaultValue="" aria-label="Habilidad">
        <option value="" disabled>Agregar habilidad…</option>
        {options.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
      </select>
      <button className="btn-ghost" disabled={pending}>Agregar</button>
      <Msg state={state} />
    </form>
  );
}

export function RemoveSkillButton({ slug, label }) {
  const [pending, start] = useTransition();
  return (
    <button aria-label={`Quitar ${label}`} disabled={pending} onClick={() => start(() => removeSkill(slug))} className="ml-0.5 rounded-full px-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600">
      ×
    </button>
  );
}

export function AddProjectForm() {
  const [state, onSubmit, pending, ref] = useFormAction(addProject, { resetOnSuccess: true });
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn-ghost" onClick={() => setOpen(true)}>+ Agregar proyecto</button>;
  return (
    <form ref={ref} onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2">
      <input name="title" className="input sm:col-span-2" placeholder="Nombre del proyecto (si es de GitHub, se toma del repositorio)" minLength={3} maxLength={120} aria-label="Nombre del proyecto" />
      <input name="repo_url" type="url" className="input" placeholder="https://github.com/usuario/repo" aria-label="Enlace al repositorio" />
      <input name="demo_url" type="url" className="input" placeholder="https://mi-demo.vercel.app (opcional)" aria-label="Enlace a la demo" />
      <input name="description" className="input sm:col-span-2" placeholder="¿Qué hace? (opcional)" maxLength={300} aria-label="Descripción" />
      <div className="flex items-center gap-2 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cerrar</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function RemoveProjectButton({ projectId }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => removeProject(projectId))} className="text-xs text-slate-400 hover:text-rose-600">
      {pending ? "Quitando…" : "Quitar"}
    </button>
  );
}

export function GitHubForm({ defaultUser }) {
  const [state, onSubmit, pending] = useFormAction(syncGitHub);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="label" htmlFor="gh">Usuario de GitHub</label>
      <div className="flex gap-2">
        <input id="gh" name="username" className="input" placeholder="ej. octocat" defaultValue={defaultUser ?? ""} required autoComplete="off" />
        <button className="btn-primary" disabled={pending}>{pending ? "Revisando…" : "Revisar repos"}</button>
      </div>
      <Msg state={state} />
    </form>
  );
}

// ---------------- empresa ----------------
function SkillPicker({ name, selected, onToggle, tone }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SKILL_OPTIONS.map((s) => {
        const on = selected.includes(s.slug);
        return (
          <button
            type="button"
            key={s.slug}
            aria-pressed={on}
            onClick={() => onToggle(s.slug)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
              on ? (tone === "req" ? "bg-indigo-600 text-white ring-indigo-600" : "bg-sky-100 text-sky-800 ring-sky-300") : "bg-surface text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        );
      })}
      {selected.map((k) => <input key={k} type="hidden" name={name} value={k} />)}
    </div>
  );
}

export function ChallengeForm() {
  const [state, onSubmit, pending] = useFormAction(createChallenge);
  const [req, setReq] = useState([]);
  const [nice, setNice] = useState([]);
  const toggle = (list, set, other, setOther) => (k) => {
    set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
    if (other.includes(k)) setOther(other.filter((x) => x !== k));
  };
  const total = req.length + nice.length;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">Título del micro-reto</label>
        <input id="title" name="title" className="input" placeholder="ej. Panel de inventario para un negocio local" required minLength={5} maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción y entregable</label>
        <textarea id="description" name="description" rows={3} maxLength={1000} className="input" placeholder="¿Qué problema real quieres resolver? ¿Qué esperas recibir?" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="reward">Pago (MXN)</label>
          <input id="reward" name="reward_mxn" type="number" min="0" step="500" defaultValue="5000" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="duration">Duración</label>
          <select id="duration" name="duration" className="input" defaultValue="2 semanas">
            <option>1 semana</option><option>2 semanas</option><option>3 semanas</option><option>4 semanas</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="modality">Modalidad</label>
          <select id="modality" name="modality" className="input" defaultValue="Remoto">
            <option>Remoto</option><option>Híbrido</option><option>Presencial</option>
          </select>
        </div>
      </div>
      <div>
        <p className="label">Habilidades obligatorias <span className="font-normal text-slate-500">(80% del puntaje)</span></p>
        <SkillPicker name="required" selected={req} onToggle={toggle(req, setReq, nice, setNice)} tone="req" />
      </div>
      <div>
        <p className="label">Habilidades deseables <span className="font-normal text-slate-500">(20% del puntaje)</span></p>
        <SkillPicker name="nice" selected={nice} onToggle={toggle(nice, setNice, req, setReq)} tone="nice" />
      </div>
      <p className={`text-xs ${total > 8 ? "text-rose-600" : "text-slate-500"}`}>{total} de 8 habilidades como máximo · mínimo 1 obligatoria y 2 en total.</p>
      <Msg state={state} />
      <button className="btn-primary w-full sm:w-auto" disabled={pending}>{pending ? "Publicando…" : "Publicar reto y ver talento compatible →"}</button>
    </form>
  );
}
