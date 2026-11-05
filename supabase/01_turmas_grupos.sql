-- =====================================================================
-- PASTA DA PROVA — ETAPA 1: perfis, turmas e grupos
-- Como usar: no painel do Supabase, abra "SQL Editor", cole TODO este
-- arquivo e clique em "Run". Pode rodar de novo sem problema: ele
-- apaga e recria as tabelas da etapa 1 (os dados delas se perdem!).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) LIMPEZA: remove versões anteriores (ou uma "profiles" de exemplo)
-- ---------------------------------------------------------------------
drop trigger if exists ao_criar_usuario on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.grupo_membros cascade;
drop table if exists public.grupos cascade;
drop table if exists public.turma_membros cascade;
drop table if exists public.turmas cascade;
drop table if exists public.profiles cascade;
drop function if exists public.criar_perfil_novo_usuario() cascade;
drop function if exists public.handle_new_user() cascade;

-- ---------------------------------------------------------------------
-- 1) TABELAS
-- ---------------------------------------------------------------------

-- Perfil de cada pessoa (criado automaticamente no primeiro login)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Turmas (ex.: "Direito 3º semestre — Noturno")
create table public.turmas (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (char_length(nome) between 2 and 80),
  codigo_convite  text not null unique,
  criada_por      uuid not null references public.profiles (id),
  created_at      timestamptz not null default now()
);

-- Quem está em cada turma (admin = quem criou)
create table public.turma_membros (
  turma_id  uuid not null references public.turmas (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  papel     text not null default 'membro' check (papel in ('admin', 'membro')),
  entrou_em timestamptz not null default now(),
  primary key (turma_id, user_id)
);

-- Grupos de estudo dentro de uma turma (ex.: "Grupo da P1")
create table public.grupos (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid not null references public.turmas (id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 60),
  criado_por  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now()
);

-- Quem está em cada grupo
create table public.grupo_membros (
  grupo_id  uuid not null references public.grupos (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

create index on public.turma_membros (user_id);
create index on public.grupos (turma_id);
create index on public.grupo_membros (user_id);

-- ---------------------------------------------------------------------
-- 2) PERFIL AUTOMÁTICO: quando alguém faz o 1º login, cria o perfil
-- ---------------------------------------------------------------------
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- ---------------------------------------------------------------------
-- 3) FUNÇÕES AUXILIARES DE SEGURANÇA
-- ("security definer" = rodam com permissão total, mas só respondem
--  sim/não sobre a PRÓPRIA pessoa logada. Evitam loops nas regras.)
-- ---------------------------------------------------------------------
create or replace function public.eh_membro_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.turma_membros
    where turma_id = p_turma and user_id = auth.uid()
  );
$$;

create or replace function public.eh_admin_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.turma_membros
    where turma_id = p_turma and user_id = auth.uid() and papel = 'admin'
  );
$$;

create or replace function public.eh_membro_grupo(p_grupo uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.grupo_membros
    where grupo_id = p_grupo and user_id = auth.uid()
  );
$$;

create or replace function public.turma_do_grupo(p_grupo uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select turma_id from public.grupos where id = p_grupo;
$$;

-- A pessoa logada está em alguma turma junto com "p_outro"?
create or replace function public.compartilha_turma(p_outro uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.turma_membros a
    join public.turma_membros b on a.turma_id = b.turma_id
    where a.user_id = auth.uid() and b.user_id = p_outro
  );
$$;

-- ---------------------------------------------------------------------
-- 4) ROW LEVEL SECURITY (RLS): quem pode ver/alterar cada linha
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.turmas        enable row level security;
alter table public.turma_membros enable row level security;
alter table public.grupos        enable row level security;
alter table public.grupo_membros enable row level security;

-- PERFIS: vejo o meu e o de quem está numa turma comigo
create policy "ver perfis de colegas" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.compartilha_turma(id));

create policy "editar o próprio perfil" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- TURMAS: só membros veem. Criar/entrar é feito pelas funções da seção 5.
create policy "membros veem a turma" on public.turmas
  for select to authenticated
  using (public.eh_membro_turma(id));

create policy "admin edita a turma" on public.turmas
  for update to authenticated
  using (public.eh_admin_turma(id)) with check (public.eh_admin_turma(id));

create policy "admin apaga a turma" on public.turmas
  for delete to authenticated
  using (public.eh_admin_turma(id));

-- MEMBROS DA TURMA
create policy "membros veem colegas de turma" on public.turma_membros
  for select to authenticated
  using (public.eh_membro_turma(turma_id));

create policy "sair da turma ou admin remove" on public.turma_membros
  for delete to authenticated
  using (user_id = auth.uid() or public.eh_admin_turma(turma_id));

-- GRUPOS: todos da turma veem o NOME dos grupos
-- (o material de um grupo só será visível aos membros dele — etapa 2)
create policy "membros da turma veem grupos" on public.grupos
  for select to authenticated
  using (public.eh_membro_turma(turma_id));

create policy "criador ou admin edita grupo" on public.grupos
  for update to authenticated
  using (criado_por = auth.uid() or public.eh_admin_turma(turma_id))
  with check (criado_por = auth.uid() or public.eh_admin_turma(turma_id));

create policy "criador ou admin apaga grupo" on public.grupos
  for delete to authenticated
  using (criado_por = auth.uid() or public.eh_admin_turma(turma_id));

-- MEMBROS DO GRUPO
create policy "turma vê membros dos grupos" on public.grupo_membros
  for select to authenticated
  using (public.eh_membro_turma(public.turma_do_grupo(grupo_id)));

-- Quem já é do grupo (ou o admin da turma) adiciona colegas DA MESMA turma
create policy "membro do grupo adiciona colega" on public.grupo_membros
  for insert to authenticated
  with check (
    (public.eh_membro_grupo(grupo_id)
      or public.eh_admin_turma(public.turma_do_grupo(grupo_id)))
    and exists (
      select 1 from public.turma_membros tm
      where tm.turma_id = public.turma_do_grupo(grupo_id)
        and tm.user_id = grupo_membros.user_id
    )
  );

-- Sair do grupo, ou ser removido pelo criador do grupo / admin da turma
create policy "sair do grupo ou remover" on public.grupo_membros
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.grupos g
               where g.id = grupo_id and g.criado_por = auth.uid())
    or public.eh_admin_turma(public.turma_do_grupo(grupo_id))
  );

-- ---------------------------------------------------------------------
-- 5) AÇÕES ESPECIAIS (o app chama estas funções)
-- ---------------------------------------------------------------------

-- Gera um código tipo DIR-7K2P (sem letras confusas como O/0, I/1)
create or replace function public.gerar_codigo_convite()
returns text language plpgsql volatile set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  codigo text;
begin
  loop
    codigo := 'DIR-';
    for i in 1..4 loop
      codigo := codigo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.turmas where codigo_convite = codigo);
  end loop;
  return codigo;
end;
$$;

-- Cria a turma e coloca quem criou como admin
create or replace function public.criar_turma(p_nome text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  nova uuid;
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro.';
  end if;
  insert into public.turmas (nome, codigo_convite, criada_por)
  values (trim(p_nome), public.gerar_codigo_convite(), auth.uid())
  returning id into nova;

  insert into public.turma_membros (turma_id, user_id, papel)
  values (nova, auth.uid(), 'admin');
  return nova;
end;
$$;

-- Entra numa turma pelo código (ninguém consegue "listar" turmas alheias)
create or replace function public.entrar_turma(p_codigo text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  alvo uuid;
  limpo text := upper(replace(trim(p_codigo), ' ', ''));
begin
  if auth.uid() is null then
    raise exception 'Faça login primeiro.';
  end if;
  -- aceita "7K2P" sem o prefixo também
  if limpo not like 'DIR-%' then
    limpo := 'DIR-' || replace(limpo, 'DIR', '');
  end if;

  select id into alvo from public.turmas where codigo_convite = limpo;
  if alvo is null then
    raise exception 'Código de convite não encontrado.';
  end if;

  insert into public.turma_membros (turma_id, user_id)
  values (alvo, auth.uid())
  on conflict do nothing;
  return alvo;
end;
$$;

-- Cria um grupo dentro da turma e coloca quem criou como membro
create or replace function public.criar_grupo(p_turma uuid, p_nome text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  novo uuid;
begin
  if not public.eh_membro_turma(p_turma) then
    raise exception 'Você não faz parte desta turma.';
  end if;
  insert into public.grupos (turma_id, nome, criado_por)
  values (p_turma, trim(p_nome), auth.uid())
  returning id into novo;

  insert into public.grupo_membros (grupo_id, user_id)
  values (novo, auth.uid());
  return novo;
end;
$$;

-- Admin gera um novo código (se o antigo vazou)
create or replace function public.novo_codigo_turma(p_turma uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  codigo text;
begin
  if not public.eh_admin_turma(p_turma) then
    raise exception 'Só o admin da turma pode trocar o código.';
  end if;
  codigo := public.gerar_codigo_convite();
  update public.turmas set codigo_convite = codigo where id = p_turma;
  return codigo;
end;
$$;

-- Visitantes sem login não podem chamar nada disso
revoke execute on function
  public.criar_turma(text), public.entrar_turma(text),
  public.criar_grupo(uuid, text), public.novo_codigo_turma(uuid)
from anon, public;
grant execute on function
  public.criar_turma(text), public.entrar_turma(text),
  public.criar_grupo(uuid, text), public.novo_codigo_turma(uuid)
to authenticated;
