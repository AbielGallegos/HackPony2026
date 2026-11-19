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
