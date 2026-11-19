-- Puente Técnico · instalación completa (generado por scripts/gen-seed-sql.mjs).
-- Pegar TODO en Supabase → SQL Editor → Run. Es idempotente: se puede ejecutar de nuevo.

-- ============================================================
-- Puente Técnico · 001 · Esquema (dueño: Cid)
-- Ejecutar en Supabase → SQL Editor, en orden: 001, 002, seed.sql
-- ============================================================

create extension if not exists pgcrypto;

-- Perfil común. 1:1 con auth.users. El rol se fija al registrarse.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('student', 'company')),
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_at   timestamptz not null default now()
);

create table if not exists public.students (
  id              uuid primary key references public.profiles(id) on delete cascade,
  university      text check (char_length(university) <= 120),
  career          text check (char_length(career) <= 120),
  semester        int  check (semester between 1 and 14),
  city            text check (char_length(city) <= 80),
  bio             text check (char_length(bio) <= 500),
  github_username text check (github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$')
);

create table if not exists public.companies (
  id           uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 2 and 120),
  sector       text check (char_length(sector) <= 80),
  city         text check (char_length(city) <= 80),
  description  text check (char_length(description) <= 500),
  website_url  text check (website_url ~ '^https://')
);

-- Catálogo central: el slug es la llave (evita "Node.js" vs "nodejs").
create table if not exists public.skills (
  slug     text primary key check (slug ~ '^[a-z0-9-]{1,40}$'),
  label    text not null,
  category text
);

create table if not exists public.student_skills (
  student_id     uuid not null references public.students(id) on delete cascade,
  skill_slug     text not null references public.skills(slug),
  evidence_count int  not null default 0 check (evidence_count >= 0), -- repos públicos que la respaldan
  primary key (student_id, skill_slug)
);

create table if not exists public.portfolio_projects (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 300),
  repo_url    text check (repo_url ~ '^https://'),
  demo_url    text check (demo_url ~ '^https://'),
  language    text,
  stars       int  not null default 0,
  from_github boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null check (char_length(title) between 5 and 120),
  description text check (char_length(description) <= 1000),
  status      text not null default 'open' check (status in ('open', 'closed')),
  reward_mxn  int  not null default 0 check (reward_mxn between 0 and 1000000),
  duration    text check (char_length(duration) <= 40),
  modality    text check (char_length(modality) <= 60),
  created_at  timestamptz not null default now()
);

create table if not exists public.challenge_skills (
  challenge_id uuid    not null references public.challenges(id) on delete cascade,
  skill_slug   text    not null references public.skills(slug),
  is_required  boolean not null default true,
  primary key (challenge_id, skill_slug)
);

create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  status         text not null default 'postulado'
                 check (status in ('postulado', 'en_revision', 'seleccionado', 'descartado')),
  score_at_apply int  not null check (score_at_apply between 0 and 100),
  created_at     timestamptz not null default now(),
  unique (challenge_id, student_id)              -- una postulación por reto (doble clic seguro)
);

create index if not exists idx_student_skills_skill   on public.student_skills (skill_slug);
create index if not exists idx_challenge_skills_skill on public.challenge_skills (skill_slug);
create index if not exists idx_applications_challenge on public.applications (challenge_id);
create index if not exists idx_applications_student   on public.applications (student_id);
create index if not exists idx_challenges_status      on public.challenges (status, created_at desc);
create index if not exists idx_projects_student       on public.portfolio_projects (student_id);

-- ------------------------------------------------------------
-- Alta automática: al crear un usuario en Supabase Auth se crea
-- su perfil con el rol enviado en el registro (solo student|company).
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', '');
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
begin
  if v_role not in ('student', 'company') then
    raise exception 'Rol inválido: debe ser student o company';
  end if;

  insert into public.profiles (id, role, display_name) values (new.id, v_role, left(v_name, 80));

  if v_role = 'student' then
    insert into public.students (id) values (new.id);
  else
    insert into public.companies (id, company_name) values (new.id, left(v_name, 120));
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Puente Técnico · 002 · Seguridad: RLS y permisos (dueño: Abiel)
-- Regla: la Server Action valida, y la base de datos vuelve a validar.
-- ============================================================

-- ---------- funciones auxiliares (security definer: no recursión de RLS) ----------
create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = (select auth.uid()) $$;

create or replace function public.owns_challenge(p_challenge uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.challenges where id = p_challenge and company_id = (select auth.uid())) $$;

create or replace function public.applied_to(p_challenge uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.applications where challenge_id = p_challenge and student_id = (select auth.uid())) $$;

-- Cifras de la portada sin exponer filas de estudiantes a visitantes anónimos.
create or replace function public.public_stats()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'challenges', (select count(*) from public.challenges where status = 'open'),
    'companies',  (select count(*) from public.companies),
    'students',   (select count(*) from public.students),
    'reward_mxn', (select coalesce(sum(reward_mxn), 0) from public.challenges where status = 'open')
  )
$$;

revoke all on function public.my_role() from public;
revoke all on function public.owns_challenge(uuid) from public;
revoke all on function public.applied_to(uuid) from public;
grant execute on function public.my_role(), public.owns_challenge(uuid), public.applied_to(uuid) to authenticated;
grant execute on function public.public_stats() to anon, authenticated;

-- ---------- activar RLS en las 9 tablas ----------
alter table public.profiles           enable row level security;
alter table public.students           enable row level security;
alter table public.companies          enable row level security;
alter table public.skills             enable row level security;
alter table public.student_skills     enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.challenges         enable row level security;
alter table public.challenge_skills   enable row level security;
alter table public.applications       enable row level security;

-- ---------- permisos por columna: el rol NO se puede cambiar ----------
revoke update on public.profiles from authenticated, anon;
grant  update (display_name) on public.profiles to authenticated;

revoke update on public.applications from authenticated, anon;
grant  update (status) on public.applications to authenticated;  -- solo el estado, y solo la empresa (política abajo)

revoke update on public.challenges from authenticated, anon;
grant  update (title, description, status, reward_mxn, duration, modality) on public.challenges to authenticated;

-- ---------- profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- INSERT solo lo hace el trigger handle_new_user (security definer). Sin DELETE.

-- ---------- students ----------
drop policy if exists students_select on public.students;
create policy students_select on public.students for select to authenticated using (true);
drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- companies (públicas: aparecen en el tablero) ----------
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to anon, authenticated using (true);
drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- skills (catálogo, solo lectura) ----------
drop policy if exists skills_select on public.skills;
create policy skills_select on public.skills for select to anon, authenticated using (true);

-- ---------- student_skills ----------
drop policy if exists student_skills_select on public.student_skills;
create policy student_skills_select on public.student_skills for select to authenticated using (true);
drop policy if exists student_skills_insert_own on public.student_skills;
create policy student_skills_insert_own on public.student_skills for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.my_role()) = 'student');
drop policy if exists student_skills_update_own on public.student_skills;
create policy student_skills_update_own on public.student_skills for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
drop policy if exists student_skills_delete_own on public.student_skills;
create policy student_skills_delete_own on public.student_skills for delete to authenticated
  using (student_id = (select auth.uid()));

-- ---------- portfolio_projects ----------
drop policy if exists projects_select on public.portfolio_projects;
create policy projects_select on public.portfolio_projects for select to authenticated using (true);
drop policy if exists projects_insert_own on public.portfolio_projects;
create policy projects_insert_own on public.portfolio_projects for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.my_role()) = 'student');
drop policy if exists projects_update_own on public.portfolio_projects;
create policy projects_update_own on public.portfolio_projects for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
drop policy if exists projects_delete_own on public.portfolio_projects;
create policy projects_delete_own on public.portfolio_projects for delete to authenticated
  using (student_id = (select auth.uid()));

-- ---------- challenges ----------
-- Visibles: abiertos para todos; cerrados solo para su empresa o quien se postuló.
drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges for select to anon, authenticated
  using (status = 'open' or company_id = (select auth.uid()) or public.applied_to(id));
drop policy if exists challenges_insert_company on public.challenges;
create policy challenges_insert_company on public.challenges for insert to authenticated
  with check (company_id = (select auth.uid()) and (select public.my_role()) = 'company');
drop policy if exists challenges_update_own on public.challenges;
create policy challenges_update_own on public.challenges for update to authenticated
  using (company_id = (select auth.uid())) with check (company_id = (select auth.uid()));
-- Sin DELETE: los retos se cierran, no se borran (conserva el historial de postulaciones).

-- ---------- challenge_skills ----------
drop policy if exists challenge_skills_select on public.challenge_skills;
create policy challenge_skills_select on public.challenge_skills for select to anon, authenticated using (true);
drop policy if exists challenge_skills_insert_owner on public.challenge_skills;
create policy challenge_skills_insert_owner on public.challenge_skills for insert to authenticated
  with check (public.owns_challenge(challenge_id));
drop policy if exists challenge_skills_update_owner on public.challenge_skills;
create policy challenge_skills_update_owner on public.challenge_skills for update to authenticated
  using (public.owns_challenge(challenge_id)) with check (public.owns_challenge(challenge_id));
drop policy if exists challenge_skills_delete_owner on public.challenge_skills;
create policy challenge_skills_delete_owner on public.challenge_skills for delete to authenticated
  using (public.owns_challenge(challenge_id));

-- ---------- applications ----------
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select to authenticated
  using (student_id = (select auth.uid()) or public.owns_challenge(challenge_id));
drop policy if exists applications_insert_student on public.applications;
create policy applications_insert_student on public.applications for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select public.my_role()) = 'student'
    and exists (select 1 from public.challenges c where c.id = challenge_id and c.status = 'open')
  );
drop policy if exists applications_update_owner on public.applications;
create policy applications_update_owner on public.applications for update to authenticated
  using (public.owns_challenge(challenge_id)) with check (public.owns_challenge(challenge_id));
-- Sin DELETE.

-- ============================================================
-- Puente Técnico · 003 · Publicar un reto en una sola transacción (dueño: José)
-- security invoker: corre con los permisos del usuario ⇒ RLS sigue aplicando.
-- Si falla una habilidad, no queda un reto "a medias".
-- ============================================================
create or replace function public.create_challenge(
  p_title text,
  p_description text,
  p_reward_mxn int,
  p_duration text,
  p_modality text,
  p_required text[],
  p_nice text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_total int := coalesce(array_length(p_required, 1), 0) + coalesce(array_length(p_nice, 1), 0);
begin
  if coalesce(array_length(p_required, 1), 0) < 1 then
    raise exception 'El reto necesita al menos una habilidad obligatoria';
  end if;
  if v_total > 8 then
    raise exception 'Máximo 8 habilidades por reto';
  end if;

  insert into public.challenges (company_id, title, description, reward_mxn, duration, modality)
  values (auth.uid(), p_title, p_description, coalesce(p_reward_mxn, 0), p_duration, p_modality)
  returning id into v_id;

  insert into public.challenge_skills (challenge_id, skill_slug, is_required)
  select v_id, s, true from unnest(p_required) as s
  union
  select v_id, s, false from unnest(coalesce(p_nice, '{}')) as s where s <> all (p_required);

  return v_id;
end;
$$;

revoke all on function public.create_challenge(text, text, int, text, text, text[], text[]) from public, anon;
grant execute on function public.create_challenge(text, text, int, text, text, text[], text[]) to authenticated;

-- Generado por scripts/gen-seed-sql.mjs · catálogo de habilidades
-- Ejecutar después de 001 y 002. Es idempotente.
insert into public.skills (slug, label, category) values
  ('javascript', 'JavaScript', 'Lenguaje'),
  ('typescript', 'TypeScript', 'Lenguaje'),
  ('python', 'Python', 'Lenguaje'),
  ('java', 'Java', 'Lenguaje'),
  ('csharp', 'C#', 'Lenguaje'),
  ('cpp', 'C++', 'Lenguaje'),
  ('php', 'PHP', 'Lenguaje'),
  ('dart', 'Dart', 'Lenguaje'),
  ('kotlin', 'Kotlin', 'Lenguaje'),
  ('go', 'Go', 'Lenguaje'),
  ('html', 'HTML', 'Web'),
  ('css', 'CSS', 'Web'),
  ('react', 'React', 'Web'),
  ('nextjs', 'Next.js', 'Web'),
  ('vue', 'Vue', 'Web'),
  ('tailwind', 'Tailwind', 'Web'),
  ('node', 'Node.js', 'Backend'),
  ('apis', 'APIs REST', 'Backend'),
  ('flutter', 'Flutter', 'Móvil'),
  ('sql', 'SQL', 'Datos'),
  ('postgresql', 'PostgreSQL', 'Datos'),
  ('mongodb', 'MongoDB', 'Datos'),
  ('firebase', 'Firebase', 'Datos'),
  ('pandas', 'Pandas', 'Datos'),
  ('ml', 'Machine Learning', 'Datos'),
  ('docker', 'Docker', 'DevOps'),
  ('linux', 'Linux', 'DevOps'),
  ('git', 'Git', 'DevOps'),
  ('figma', 'Figma / UI', 'Diseño'),
  ('redes', 'Redes', 'Infraestructura'),
  ('ciberseguridad', 'Ciberseguridad', 'Infraestructura')
on conflict (slug) do update set label = excluded.label, category = excluded.category;
