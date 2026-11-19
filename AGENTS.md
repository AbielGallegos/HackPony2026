# AGENTS.md — reglas para TODAS las IA del equipo The Bugs

Pega este archivo al inicio de cada conversación con tu IA. Si una respuesta contradice estas reglas, gana este archivo.

## Producto (3 líneas)
Puente Técnico: marketplace donde empresas de Michoacán publican micro-retos y estudiantes de TI se postulan en un clic.
El % de compatibilidad es explicable (80% obligatorias + 20% deseables) y se calcula SOLO en el servidor.
Requisitos oficiales: perfil con repos y etiquetas · tablero con filtro por coincidencia · postulación en un clic + ranking por %.

## Versiones fijas (no cambiar sin acuerdo del equipo)
- Next.js **16.4** (App Router) · React **19** · Tailwind CSS **4** · `@supabase/ssr` 0.12 · `@supabase/supabase-js` 2
- JavaScript (`.js` / `.mjs`). Archivos nuevos pueden ser `.ts`, pero NO migrar los existentes.

## Reglas de Next.js 16 que las IA suelen romper
1. NO existe `middleware.ts`: el archivo se llama **`proxy.js`** y exporta `proxy`.
2. `cookies()`, `headers()`, `params` y `searchParams` son **asíncronos**: siempre `await`.
3. Supabase: usar `@supabase/ssr` (`createServerClient`). PROHIBIDO `@supabase/auth-helpers-nextjs`.
4. Nada de Pages Router, `getServerSideProps`, `getInitialProps` ni API Routes para escribir datos: usar **Server Actions** en `app/actions/`.
5. La documentación correcta de esta versión está en `node_modules/next/dist/docs/`.

## Reglas del proyecto
- Solo modificas los archivos de tu módulo (tabla abajo). Si necesitas otro, pídeselo a su dueño.
- **No instales dependencias nuevas.** Si crees que hace falta una, explícalo y detente.
- Las páginas NO llaman a `supabase.from(...)`: leen y escriben con `lib/queries.mjs` y `app/actions/*`.
- Cada Server Action empieza con `requireRole(...)` y valida entradas con `lib/validation.mjs`.
- Una Server Action devuelve `{ ok: true, ... }` o `{ ok: false, error: "mensaje para el usuario" }`.
- El % NUNCA viene del navegador: siempre `computeMatch()` en el servidor.
- La `service_role` key solo existe en `.env.local` de Cid para `npm run seed:demo`. Jamás en Vercel ni en el navegador.
- Di "con evidencia en GitHub", nunca "verificada".
- Entrega cambios pequeños, explica cómo probarlos y corre `npm run build` y `npm test` antes del PR.

## Dueños de archivos
| Dueño | Archivos |
| --- | --- |
| José | `lib/matching.mjs`, `lib/matching.test.mjs`, `lib/skills.mjs`, `lib/github.mjs`, `app/actions/applications.js`, `app/actions/challenges.js`, `supabase/migrations/003_*` |
| Abiel | `proxy.js`, `lib/supabase/proxy.mjs`, `lib/auth.mjs`, `lib/validation.mjs`, `app/actions/auth.js`, `app/actions/profile.js`, `supabase/migrations/002_rls.sql`, `supabase/tests/*` |
| Azul | `app/**/page.js`, `app/layout.js`, `app/globals.css`, `components/*` |
| Cid | `supabase/migrations/001_schema.sql`, `supabase/seed.sql`, `scripts/*`, `lib/supabase/server.mjs`, `lib/queries.mjs`, `lib/local-store.mjs`, `lib/demo-data.mjs`, `lib/mode.mjs`, `docs/CONTRATOS.md`, `AGENTS.md` |

Contratos (firmas, tablas, formas de datos): `docs/CONTRATOS.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
