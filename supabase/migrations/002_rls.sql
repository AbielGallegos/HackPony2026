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
