import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/auth.mjs";
import { DATA_MODE } from "@/lib/mode.mjs";
import { signOut } from "./actions/auth";
import { BRAND } from "@/lib/brand.mjs";

export const metadata = {
  title: "NextPoint · Retos reales para talento universitario",
  description: BRAND.description,
  applicationName: BRAND.shortName,
  // iPhone/iPad: abrir desde la pantalla de inicio sin barras de Safari.
  appleWebApp: { capable: true, title: BRAND.shortName, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: BRAND.themeColor,
  width: "device-width",
  initialScale: 1,
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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-bg/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3" aria-label="Principal">
            <Link href="/" className="mr-2 flex items-center" aria-label="NextPoint, inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/nextpoint-icon.png" alt="" width="28" height="28" className="h-7 w-auto sm:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/nextpoint-logo.png" alt="NextPoint" width="144" height="28" className="hidden h-7 w-auto sm:block" />
            </Link>
            <div className="flex items-center text-sm">
              <NavLink href="/retos">Retos</NavLink>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  {/* El perfil se abre desde el nombre (estudiante → /perfil, empresa → /empresa). */}
                  <Link
                    href={user.role === "student" ? "/perfil" : "/empresa"}
                    className="group flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100"
                    title={user.role === "student" ? "Ver mi perfil" : "Ver mi empresa"}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white" aria-hidden="true">
                      {user.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <span className="hidden text-left text-xs leading-tight sm:block">
                      <span className="text-slate-500">{user.role === "student" ? "Estudiante" : "Empresa"}</span>
                      <br />
                      <span className="font-semibold text-slate-800 group-hover:text-neon">{user.displayName}</span>
                    </span>
                    <span className="sr-only">{user.role === "student" ? "Ver mi perfil" : "Ver mi empresa"}</span>
                  </Link>
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
          <Link href="/arquitectura" className="underline">Arquitectura</Link> ·{" "}
          <Link href="/instalar" className="underline">Instalar en el celular</Link> · Datos:{" "}
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
