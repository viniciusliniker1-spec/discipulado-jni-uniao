-- =====================================================================
-- Discipulado JNI União — esquema, regras de acesso (RLS) e funções
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Depois troque os valores da tabela config (códigos e e-mail do ADM).
-- =====================================================================

-- ---------- configuração privada (ninguém lê direto pelo app) ----------
create table if not exists public.config (
  chave text primary key,
  valor text not null
);
alter table public.config enable row level security;   -- sem políticas: só funções internas leem

insert into public.config (chave, valor) values
  ('codigo_discipulador', 'JNIconexao'),       -- código para criar conta de discipulador
  ('codigo_acesso',       'JNIconexao'),       -- código para o ADM liberar a versão completa
  ('email_admin',         'troque@seu-email.com')  -- e-mail que vira administrador
on conflict (chave) do nothing;

-- Para trocar depois, no SQL Editor:
--   update public.config set valor = 'NOVO_CODIGO' where chave = 'codigo_discipulador';
--   update public.config set valor = 'seu@email.com' where chave = 'email_admin';

-- ---------- tabelas ----------
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null check (papel in ('aluno', 'discipulador', 'admin')),
  duplo boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.designacoes (
  aluno_id uuid primary key references public.perfis(id) on delete cascade,
  discipulador_id uuid references public.perfis(id) on delete set null
);

create table if not exists public.encontros (
  aluno_id uuid not null references public.perfis(id) on delete cascade,
  n int not null check (n between 1 and 10),
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (aluno_id, n)
);

create table if not exists public.depois (
  aluno_id uuid primary key references public.perfis(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb
);

create table if not exists public.notas (
  discipulador_id uuid not null references public.perfis(id) on delete cascade,
  aluno_id uuid not null references public.perfis(id) on delete cascade,
  n int not null check (n between 1 and 10),
  dados jsonb not null default '{}'::jsonb,
  primary key (discipulador_id, aluno_id, n)
);

create table if not exists public.atividade (
  user_id uuid not null references public.perfis(id) on delete cascade,
  dia date not null,
  primary key (user_id, dia)
);

create table if not exists public.atividade_notas (
  discipulador_id uuid not null references public.perfis(id) on delete cascade,
  dia date not null,
  primary key (discipulador_id, dia)
);

-- ---------- funções auxiliares (security definer evita recursão nas políticas) ----------
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'admin' from perfis where id = auth.uid()), false)
$$;

create or replace function public.pode_curso() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('aluno', 'discipulador') or (papel = 'admin' and duplo)
                   from perfis where id = auth.uid()), false)
$$;

create or replace function public.pode_conduzir() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'discipulador' or (papel = 'admin' and duplo)
                   from perfis where id = auth.uid()), false)
$$;

create or replace function public.eh_discipulador_de(aluno uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from designacoes d where d.aluno_id = aluno and d.discipulador_id = auth.uid())
$$;

-- ---------- gatilho: cria o perfil no cadastro ----------
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  papel_pedido text := coalesce(new.raw_user_meta_data->>'papel', 'aluno');
  codigo text := new.raw_user_meta_data->>'codigo';
  cod_disc text; email_adm text; papel_final text; nome_user text;
begin
  select valor into cod_disc from config where chave = 'codigo_discipulador';
  select valor into email_adm from config where chave = 'email_admin';
  if lower(new.email) = lower(email_adm) then
    papel_final := 'admin';
  elsif papel_pedido = 'discipulador' then
    if codigo is distinct from cod_disc then
      raise exception 'codigo_invalido';
    end if;
    papel_final := 'discipulador';
  else
    papel_final := 'aluno';
  end if;
  nome_user := coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1));
  insert into perfis (id, nome, email, papel) values (new.id, nome_user, new.email, papel_final);
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.novo_usuario();

-- ---------- ativar a versão completa (só o ADM, com o código) ----------
create or replace function public.ativar_acesso(codigo text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Somente o administrador.'; end if;
  if codigo is distinct from (select valor from config where chave = 'codigo_acesso') then
    raise exception 'Código inválido.';
  end if;
  update perfis set duplo = true where id = auth.uid();
  return true;
end $$;

-- ---------- métricas: só números e datas, nunca respostas ou registro ----------
create or replace function public.metricas_aluno(aluno uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'utc')::date;
  d jsonb; i int;
  enc jsonb := '[]'::jsonb;
  concl int := 0; dias_t int := 0; resp_t int := 0; reg_t int := 0;
  r_done boolean; r_dias int; r_resp int; r_reg int; r_bal int; r_txt int;
  ultima date; dias7 int; sem int[] := array[0,0,0,0,0,0,0,0];
  rec record;
begin
  if not (aluno = auth.uid() or public.eh_admin() or public.eh_discipulador_de(aluno)) then
    raise exception 'Sem acesso.';
  end if;

  for i in 1..10 loop
    select dados into d from encontros where aluno_id = aluno and n = i;
    if d is null then
      enc := enc || jsonb_build_object('n', i, 'done', false, 'dias', 0, 'respostas', 0,
                                       'registros', 0, 'balizas', 0, 'textos', 0);
      continue;
    end if;
    r_done := coalesce((d->>'done')::boolean, false);
    r_dias := (select count(*) from jsonb_array_elements(coalesce(d->'dias', '[]'::jsonb)) v where v::text = 'true');
    r_resp := (select count(*) from jsonb_each_text(coalesce(d->'perg', '{}'::jsonb)) v where btrim(v.value) <> '');
    r_reg  := (select count(*) from jsonb_array_elements(coalesce(d->'reg', '[]'::jsonb)) row_
               where exists (select 1 from jsonb_array_elements_text(row_) c where btrim(c) <> ''));
    r_bal  := (select count(*) from jsonb_array_elements(coalesce(d->'bal', '[]'::jsonb)) v where v::text = 'true');
    r_txt  := (select count(*) from jsonb_array_elements(coalesce(d->'txt', '[]'::jsonb)) v where v::text = 'true');
    if r_done then concl := concl + 1; end if;
    dias_t := dias_t + r_dias; resp_t := resp_t + r_resp; reg_t := reg_t + r_reg;
    enc := enc || jsonb_build_object('n', i, 'done', r_done, 'dias', r_dias, 'respostas', r_resp,
                                     'registros', r_reg, 'balizas', r_bal, 'textos', r_txt);
  end loop;

  select max(dia) into ultima from atividade where user_id = aluno;
  select count(*) into dias7 from atividade where user_id = aluno and dia >= hoje - 7;
  for rec in select dia from atividade where user_id = aluno and dia >= hoje - 55 loop
    sem[8 - ((hoje - rec.dia) / 7)] := sem[8 - ((hoje - rec.dia) / 7)] + 1;
  end loop;

  return jsonb_build_object(
    'ultimaAtividade', ultima,
    'diasAtivos7', dias7,
    'concluidos', concl,
    'dias', dias_t,
    'respostas', resp_t,
    'registros', reg_t,
    'encontros', enc,
    'semanas', to_jsonb(sem)
  );
end $$;

-- ---------- status de conclusão para o ADM (sem conteúdo) ----------
create or replace function public.status_conclusao() returns table (aluno_id uuid, encontros int[])
language sql stable security definer set search_path = public as $$
  select e.aluno_id, array_agg(e.n order by e.n)
  from encontros e
  where public.eh_admin() and coalesce((e.dados->>'done')::boolean, false)
  group by e.aluno_id
$$;

-- ---------- checagem prévia do código de discipulador (antes do cadastro) ----------
-- Responde só sim ou não; a regra de verdade continua no gatilho acima.
create or replace function public.codigo_discipulador_valido(codigo text) returns boolean
language sql stable security definer set search_path = public as $$
  select codigo is not distinct from (select valor from config where chave = 'codigo_discipulador')
$$;
revoke all on function public.codigo_discipulador_valido(text) from public;
grant execute on function public.codigo_discipulador_valido(text) to anon, authenticated;

-- ---------- políticas de acesso (RLS) ----------
alter table public.perfis enable row level security;
alter table public.designacoes enable row level security;
alter table public.encontros enable row level security;
alter table public.depois enable row level security;
alter table public.notas enable row level security;
alter table public.atividade enable row level security;
alter table public.atividade_notas enable row level security;

-- perfis: cada um vê o próprio; discipulador vê seus discípulos; ADM vê todos
create policy perfis_ler on public.perfis for select to authenticated using (
  id = auth.uid()
  or public.eh_admin()
  or public.eh_discipulador_de(id)                                              -- discipulador vê seus discípulos
  or exists (select 1 from public.designacoes d                                  -- aluno vê o seu discipulador
             where d.aluno_id = auth.uid() and d.discipulador_id = perfis.id));
-- o usuário só pode mudar o próprio nome (papel e duplo são protegidos abaixo)
create policy perfis_nome on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to authenticated;
grant update (nome) on public.perfis to authenticated;

-- designações: aluno e discipulador veem a sua; só o ADM altera
create policy designacoes_ler on public.designacoes for select to authenticated using (
  aluno_id = auth.uid() or discipulador_id = auth.uid() or public.eh_admin());
create policy designacoes_adm on public.designacoes for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- encontros (registro do discípulo): só o próprio aluno, e o discipulador designado para ler
create policy encontros_proprios on public.encontros for all to authenticated
  using (aluno_id = auth.uid() and public.pode_curso())
  with check (aluno_id = auth.uid() and public.pode_curso());
create policy encontros_discipulador on public.encontros for select to authenticated
  using (public.pode_conduzir() and public.eh_discipulador_de(aluno_id));

-- depois do décimo: só o próprio aluno
create policy depois_proprio on public.depois for all to authenticated
  using (aluno_id = auth.uid() and public.pode_curso())
  with check (aluno_id = auth.uid() and public.pode_curso());

-- notas do discipulador: só o discipulador designado àquele aluno
create policy notas_discipulador on public.notas for all to authenticated
  using (discipulador_id = auth.uid() and public.pode_conduzir() and public.eh_discipulador_de(aluno_id))
  with check (discipulador_id = auth.uid() and public.pode_conduzir() and public.eh_discipulador_de(aluno_id));

-- atividade: o próprio usuário registra a sua
create policy atividade_propria on public.atividade for all to authenticated
  using (user_id = auth.uid() and public.pode_curso())
  with check (user_id = auth.uid() and public.pode_curso());
create policy atividade_notas_propria on public.atividade_notas for all to authenticated
  using (discipulador_id = auth.uid() and public.pode_conduzir())
  with check (discipulador_id = auth.uid() and public.pode_conduzir());

-- permissões de tabela (o RLS acima filtra as linhas; sem isso o app não consegue ler/gravar)
revoke all on public.config from anon, authenticated;
revoke all on public.encontros, public.depois, public.notas, public.atividade,
              public.atividade_notas, public.designacoes from anon;
grant select, insert, update, delete on public.encontros, public.depois, public.notas,
      public.atividade, public.atividade_notas, public.designacoes to authenticated;

-- funções que o app chama: só usuários logados
revoke all on function public.metricas_aluno(uuid) from public, anon;
grant execute on function public.metricas_aluno(uuid) to authenticated;
revoke all on function public.status_conclusao() from public, anon;
grant execute on function public.status_conclusao() to authenticated;
revoke all on function public.ativar_acesso(text) from public, anon;
grant execute on function public.ativar_acesso(text) to authenticated;

-- =====================================================================
-- Avisos e designação do discipulador (pelo ADM)
-- =====================================================================
create table if not exists public.avisos (
  id bigint generated always as identity primary key,
  destinatario_id uuid not null references public.perfis(id) on delete cascade,
  texto text not null,
  criado_em timestamptz not null default now(),
  lido boolean not null default false
);
alter table public.avisos enable row level security;
create policy avisos_proprios on public.avisos for select to authenticated using (destinatario_id = auth.uid());
create policy avisos_marcar on public.avisos for update to authenticated
  using (destinatario_id = auth.uid()) with check (destinatario_id = auth.uid());
revoke all on public.avisos from anon;
grant select on public.avisos to authenticated;
grant update (lido) on public.avisos to authenticated;

-- designa (ou troca / remove) o discipulador de um discípulo; cria os avisos
create or replace function public.designar_discipulador(p_aluno uuid, p_disc uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  nome_aluno text; nome_disc text; anterior uuid;
begin
  if not public.eh_admin() then raise exception 'Somente o administrador.'; end if;
  select nome into nome_aluno from perfis where id = p_aluno and papel = 'aluno';
  if nome_aluno is null then raise exception 'Discípulo inválido.'; end if;
  select discipulador_id into anterior from designacoes where aluno_id = p_aluno;

  if p_disc is null then
    delete from designacoes where aluno_id = p_aluno;
    if anterior is not null then
      insert into avisos (destinatario_id, texto) values
        (anterior, 'Você não acompanha mais ' || nome_aluno || '.'),
        (p_aluno, 'Seu discipulador foi removido. A liderança vai indicar outro.');
    end if;
    return;
  end if;

  select nome into nome_disc from perfis where id = p_disc and papel = 'discipulador';
  if nome_disc is null then raise exception 'Discipulador inválido.'; end if;

  insert into designacoes (aluno_id, discipulador_id) values (p_aluno, p_disc)
    on conflict (aluno_id) do update set discipulador_id = excluded.discipulador_id;

  if anterior is not null and anterior <> p_disc then
    insert into avisos (destinatario_id, texto) values
      (anterior, 'Você não acompanha mais ' || nome_aluno || '.');
  end if;
  insert into avisos (destinatario_id, texto) values
    (p_disc, 'Você foi designado para acompanhar ' || nome_aluno || '. O progresso aparece na sua tela inicial.'),
    (p_aluno, nome_disc || ' é agora seu discipulador.');
end $$;

revoke all on function public.designar_discipulador(uuid, uuid) from public, anon;
grant execute on function public.designar_discipulador(uuid, uuid) to authenticated;
