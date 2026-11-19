import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth.mjs";
import { isLocal } from "@/lib/mode.mjs";
import { LoginForm } from "@/components/forms";
import { resetDemo } from "../actions/auth";
import * as demo from "@/lib/demo-data.mjs";

export const metadata = { title: "Entrar · NextPoint" };

// Cuentas de demostración: se muestran en modo local o si SHOW_DEMO_ACCOUNTS=1 (para el hackatón).
// Solo se listan los correos: la contraseña NUNCA se envía al navegador.
function demoAccounts() {
  const show = isLocal || process.env.SHOW_DEMO_ACCOUNTS === "1";
  if (!show) return [];
  const pick = ["ana", "diego", "sofia"].map((k) => demo.students.find((s) => s.key === k));
  const comps = ["tecnomich", "cafe"].map((k) => demo.companies.find((c) => c.key === k));
  return [
    ...pick.map((s) => ({ id: s.key, name: s.display_name, email: s.email, role: "student" })),
    ...comps.map((c) => ({ id: c.key, name: c.company_name, email: c.email, role: "company" })),
  ];
}

export default async function Login({ searchParams }) {
  const { next, reiniciado } = await searchParams;
  const user = await getUser();
  if (user) redirect(user.role === "company" ? "/empresa" : "/retos");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="mb-5 text-sm text-slate-500">
          {isLocal ? "Modo local de DESARROLLO (sesiones simuladas): elige una cuenta." : "Entra con tu correo y contraseña."}
        </p>
        {reiniciado && <p className="mb-3 text-sm font-medium text-emerald-700">Datos de demostración restablecidos.</p>}
        <LoginForm next={next} demoAccounts={demoAccounts()} local={isLocal} />
        {!isLocal && (
          <p className="mt-5 text-center text-sm text-slate-500">
            ¿No tienes cuenta? <Link href="/registro" className="font-semibold text-indigo-700">Crear cuenta</Link>
          </p>
        )}
      </div>
      {isLocal && (
        <form action={resetDemo} className="text-right">
          <button className="text-xs text-slate-400 underline hover:text-slate-600">Restablecer datos de demostración</button>
        </form>
      )}
    </div>
  );
}
