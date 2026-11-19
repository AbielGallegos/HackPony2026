-- Pegar en Supabase → SQL Editor después de instalar. Solo LEE; no cambia nada.
-- Esperado: 9 tablas con rls_activado = true, y el número de políticas por tabla.
select c.relname as tabla,
       c.relrowsecurity as rls_activado,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- Esperado: 31 habilidades y el trigger de registro presente.
select (select count(*) from public.skills) as habilidades,
       (select count(*) from pg_trigger where tgname = 'on_auth_user_created') as trigger_registro;
