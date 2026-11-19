import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth.mjs";
import { isLocal } from "@/lib/mode.mjs";
import { SignUpForm } from "@/components/forms";

export const metadata = { title: "Crear cuenta · NextPoint" };

export default async function Registro({ searchParams }) {
  const { rol } = await searchParams;
  if (await getUser()) redirect("/retos");
  return (
    <div className="card mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
      <p className="mb-5 text-sm text-slate-500">Gratis para estudiantes. Las empresas publican micro-retos.</p>
      {isLocal ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          El registro necesita Supabase. En el modo local de desarrollo usa una <Link className="underline" href="/login">cuenta de demostración</Link>.
        </p>
      ) : (
        <SignUpForm defaultRole={rol} />
      )}
      <p className="mt-5 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-indigo-700">Inicia sesión</Link>
      </p>
    </div>
  );
}
