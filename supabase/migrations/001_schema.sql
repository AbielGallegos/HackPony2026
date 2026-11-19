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
