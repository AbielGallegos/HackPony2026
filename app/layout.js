import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/auth.mjs";
import { DATA_MODE } from "@/lib/mode.mjs";
import { signOut } from "./actions/auth";

export const metadata = {
  title: "Puente Técnico · Retos reales para talento universitario",
  description: "Marketplace donde empresas locales publican micro-retos y estudiantes muestran portafolios con evidencia.",
};

const NavLink = ({ href, children }) => (
  <Link href={href} className="rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
    {children}
  </Link>
);

export default async function RootLayout({ children }) {
  const user = await getUser();

  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3" aria-label="Principal">
            <Link href="/" className="mr-2 flex items-center gap-2 font-bold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white" aria-hidden="true">PT</span>
              <span className="hidden sm:inline">Puente Técnico</span>
            </Link>
            <div className="flex items-center text-sm">
              <NavLink href="/retos">Retos</NavLink>
              {user?.role === "student" && <NavLink href="/perfil">Mi perfil</NavLink>}
              {user?.role === "company" && <NavLink href="/empresa">Mi empresa</NavLink>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden text-right text-xs leading-tight text-slate-500 sm:block">
                    {user.role === "student" ? "Estudiante" : "Empresa"}
                    <br />
                    <span className="font-semibold text-slate-800">{user.displayName}</span>
                  </span>
                  <form action={signOut}>
                    <button className="btn-ghost px-3 py-1.5 text-xs">Salir</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost px-3 py-1.5 text-xs">Entrar</Link>
                  <Link href="/registro" className="btn-primary hidden px-3 py-1.5 text-xs sm:inline-flex">Crear cuenta</Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          The Bugs · HackPony 2026 · Empresas y personas de demostración ficticias ·{" "}
          <Link href="/arquitectura" className="underline">Arquitectura</Link> · Datos:{" "}
          {DATA_MODE === "supabase" ? (
            <span className="text-emerald-700">Supabase (en línea)</span>
          ) : (
            <span className="font-semibold text-rose-700">MODO LOCAL DE DESARROLLO: sesiones simuladas, no usar en la demo</span>
          )}
        </footer>
      </body>
    </html>
  );
}
