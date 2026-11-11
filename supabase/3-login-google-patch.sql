-- =====================================================================
-- PATCH: escolha de perfil depois do login com Google
-- Pode rodar com segurança mesmo que o schema já esteja no banco.
-- =====================================================================
alter table public.perfis add column if not exists pendente boolean not null default false;

-- contas pendentes ainda não acessam o curso nem a condução
create or replace function public.pode_curso() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not pendente and (papel in ('aluno', 'discipulador') or (papel = 'admin' and duplo))
                   from perfis where id = auth.uid()), false)
$$;

create or replace function public.pode_conduzir() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select not pendente and (papel = 'discipulador' or (papel = 'admin' and duplo))
                   from perfis where id = auth.uid()), false)
$$;

-- gatilho: cadastro por e-mail define o papel; cadastro por Google fica pendente até escolher
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  papel_pedido text := new.raw_user_meta_data->>'papel';
  provedor text := coalesce(new.raw_app_meta_data->>'provider', 'email');
  codigo text := new.raw_user_meta_data->>'codigo';
  cod_disc text; email_adm text; papel_final text; pend boolean := false; nome_user text;
begin
  select valor into cod_disc from config where chave = 'codigo_discipulador';
  select valor into email_adm from config where chave = 'email_admin';
  if lower(new.email) = lower(email_adm) then
    papel_final := 'admin';
  elsif papel_pedido is null and provedor <> 'email' then
    papel_final := 'aluno'; pend := true;
  elsif papel_pedido = 'discipulador' then
    if codigo is distinct from cod_disc then raise exception 'codigo_invalido'; end if;
    papel_final := 'discipulador';
  else
    papel_final := 'aluno';
  end if;
  nome_user := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1));
  insert into perfis (id, nome, email, papel, pendente) values (new.id, nome_user, new.email, papel_final, pend);
  return new;
end $$;

-- o próprio usuário escolhe Discípulo ou Discipulador (uma única vez)
create or replace function public.escolher_papel(p_papel text, p_codigo text default '') returns text
language plpgsql security definer set search_path = public as $$
declare pend boolean;
begin
  select pendente into pend from perfis where id = auth.uid();
  if pend is null then raise exception 'Perfil não encontrado.'; end if;
  if not pend then raise exception 'Seu perfil já foi definido.'; end if;
  if p_papel not in ('aluno', 'discipulador') then raise exception 'Escolha Discípulo ou Discipulador.'; end if;
  if p_papel = 'discipulador' and p_codigo is distinct from (select valor from config where chave = 'codigo_discipulador') then
    raise exception 'codigo_invalido';
  end if;
  update perfis set papel = p_papel, pendente = false where id = auth.uid();
  return p_papel;
end $$;

revoke all on function public.escolher_papel(text, text) from public, anon;
grant execute on function public.escolher_papel(text, text) to authenticated;
