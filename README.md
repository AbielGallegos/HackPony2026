# Puente Técnico — The Bugs · HackPony 2026

Marketplace donde empresas de Michoacán publican **micro-retos reales** y estudiantes de TI se postulan **en un clic**. Cada estudiante ve su **% de compatibilidad** (80% habilidades obligatorias + 20% deseables) y qué le falta. La empresa ve a sus candidatos **ordenados por compatibilidad**.

**Stack:** Next.js 16 (App Router, Server Actions) · Supabase (Auth + PostgreSQL con RLS) · Tailwind CSS 4 · Vercel.

---

## 1. Correr en tu computadora

```bash
npm install
npm run dev          # http://localhost:3000
```

**Supabase es obligatorio.** Sin `.env.local` válido, la app responde **503 "Servicio no disponible"** y no crea ninguna sesión. Esto es intencional: nunca cae sola en un modo simulado.

Solo para desarrollar la interfaz sin red existe el **modo local de desarrollo**: agrega `ALLOW_LOCAL_MODE=1` a `.env.local` y usa `npm run dev`. Tiene sesiones simuladas y no tiene RLS, así que nunca debe usarse en la demo ni publicarse. En producción (`npm start` o Vercel) está bloqueado aunque actives la variable.

## 2. Conectar Supabase (15 minutos, una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (región más cercana: *East US* o *West US*).
2. **Authentication → Sign In / Providers → Email:** desactiva **Confirm email** (el correo integrado de Supabase solo envía 2 por hora).
3. **SQL Editor → New query:** pega TODO `supabase/setup-completo.sql` y pulsa **Run** (contiene 001, 002, 003 y el catálogo; se puede repetir sin problema).
4. En otra consulta pega `supabase/verificar.sql` y pulsa **Run**: deben salir **9 tablas con `rls_activado = true`**, **31 habilidades** y **trigger_registro = 1**.
5. Copia `.env.example` como `.env.local` y llena, desde **Project Settings → API Keys**:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y (solo en esta computadora) `SUPABASE_SERVICE_ROLE_KEY` (la *secret key*).
6. Genera la contraseña de las cuentas demo, carga los datos y verifica todo contra el Supabase real:
   ```bash
   npm run demo:password     # guarda DEMO_PASSWORD en .env.local sin mostrarla
   npm run seed:demo         # 6 empresas, 12 estudiantes, 11 retos, 8 postulaciones (ficticios)
   npm run verify:supabase   # 28 comprobaciones reales: tablas, trigger y ataques de RLS
   ```
   `verify:supabase` crea usuarios temporales, intenta los ataques (cambiar rol, postular dos veces, ver candidatos ajenos…) y los borra al final. No imprime llaves.
7. Reinicia `npm run dev`. El pie de página debe decir **"Supabase (en línea)"**.

**Cuentas de demostración.** Todas usan la contraseña guardada en `DEMO_PASSWORD` (en el `.env.local` de quien cargó los datos). La contraseña no está en el código ni en este README.

| Rol | Correo |
| --- | --- |
| Estudiante | `ana@demo.puentetecnico.mx`, `diego@…`, `sofia@…`, `mariana@…` y 8 más |
| Empresa | `tecnomich@demo.puentetecnico.mx`, `cafe@…`, `aguacates@…`, `clinica@…`, `paracho@…`, `puerto@…` |

## 3. Publicar en Vercel

1. Sube el repositorio a GitHub (el `.gitignore` ya excluye `.env.local` y `node_modules`).
2. En Vercel: **Add New → Project →** importa el repositorio.
3. En **Environment Variables** agrega `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SHOW_DEMO_ACCOUNTS=1`. **No** agregues `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD` ni `ALLOW_LOCAL_MODE`.
   Si por error pones una llave secreta (`sb_secret_…` o `service_role`) en una variable `NEXT_PUBLIC_*`, la app la detecta y se niega a arrancar.
4. Deploy. Las variables `NEXT_PUBLIC_*` se fijan al compilar: si las cambias, vuelve a desplegar.

## 4. Pruebas

```bash
npm test     # 18 pruebas: matching (12) y validación de configuración (6)
npm run build
```

**Pruebas de seguridad (35 casos de acceso cruzado)** contra un PostgreSQL local:
```bash
npm i --no-save pg
PGURL="postgresql://postgres@localhost:5432" node supabase/tests/rls_test.mjs   # Node: Windows, Mac o Linux
# o, si tienes psql:
PGURL="postgresql://postgres@localhost:5432" bash supabase/tests/rls_test.sh
```
Comprueban, por ejemplo, que un estudiante no se cambie el rol, que nadie se postule en nombre de otro, que no se pueda postular a un reto cerrado, que la empresa B no vea los candidatos de la empresa A y que el doble clic no duplique postulaciones.

## 5. Estructura

```
proxy.js                     sesión de Supabase y rutas protegidas (Next 16)
app/                         páginas (Server Components)
app/actions/                 Server Actions: auth, profile, challenges, applications
components/                  ui.js (visual), forms.js (interactivo), StudentProfileView.js
lib/matching.mjs             SkillMatch: computeMatch + rankCandidates (+ matching.test.mjs)
lib/queries.mjs              acceso a datos (Supabase con RLS; modo local solo en desarrollo)
lib/mode.mjs                 decide el modo y valida la configuración (falla segura)
lib/auth.mjs                 getUser / requireRole
lib/validation.mjs           validación de entradas
lib/skills.mjs               catálogo de habilidades
lib/github.mjs               evidencia de repos públicos (opcional)
supabase/migrations/         001 esquema · 002 RLS · 003 create_challenge
supabase/setup-completo.sql  las 3 migraciones + catálogo en un solo archivo (SQL Editor)
supabase/verificar.sql       consulta de solo lectura: tablas, RLS, políticas y trigger
supabase/tests/              pruebas de RLS
scripts/                     seed-demo.mjs · demo-password.mjs · verify-supabase.mjs · gen-seed-sql.mjs
AGENTS.md                    reglas para las IA del equipo
docs/CONTRATOS.md            tablas, formas de datos y firmas compartidas
```

## 6. Guion corto de la demo (dos dispositivos)

1. **Laptop:** entra como TecnoMich y publica *"Panel de inventario para un negocio local"* con JavaScript, React, SQL y Git como obligatorias.
2. **Celular:** entra como Ana (JavaScript, React y Git). El reto aparece con **75%** y *"✕ SQL"*.
3. Ana se postula. Un segundo clic no duplica la postulación.
4. **Laptop:** recarga el reto. Ana aparece en el ranking y se cambia su estado a "En revisión".
5. Cerrar sesión y volver a entrar: todo sigue ahí.
6. **Demo técnica:** `npm test` en verde y luego el intento de cambiar el rol desde la API, que la base de datos rechaza.

> Importante: Ana ya tiene SQL si alguien lo agregó antes. Corre `npm run seed:demo` antes de presentar para empezar limpio.
