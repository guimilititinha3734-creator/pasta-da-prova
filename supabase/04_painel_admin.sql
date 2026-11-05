-- =====================================================================
-- PASTA DA PROVA — ETAPA 6: painel de administração (/admin)
--
-- Como usar: SQL Editor > New query > cole TODO este arquivo > Run.
-- ✅ Este arquivo NÃO apaga nada. Pode rodar de novo sem perder dados.
-- (Precisa que o 03_espaco_por_turma.sql já tenha sido rodado.)
--
-- O que cria:
--  • Lista de administradores do app (só eles abrem /admin)
--  • Planos por turma com data de vencimento: quando vence, a turma
--    volta sozinha para a cota grátis que tinha antes
--  • Funções que o painel usa (todas conferem se quem chama é admin)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) ADMINISTRADORES DO APP
-- ---------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;  -- ninguém lê pelo app

-- Você vira admin: quem criou a turma "DIR-ETQX" (a sua turma real)
insert into public.app_admins (user_id)
select criada_por from public.turmas where codigo_convite = 'DIR-ETQX'
on conflict do nothing;

-- Se não achou (ex.: o código foi trocado), usa quem criou a 1ª turma
insert into public.app_admins (user_id)
select criada_por from public.turmas
where nome not like 'Turma de Exemplo%'
  and not exists (select 1 from public.app_admins)
order by created_at limit 1
on conflict do nothing;

-- Para adicionar outro admin pelo e-mail (rode só esta linha, trocando o e-mail):
--   insert into public.app_admins (user_id) select id from auth.users where email = 'fulano@gmail.com';

create or replace function public.eh_admin_app()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2) PLANOS POR TURMA (com vencimento)
-- ---------------------------------------------------------------------
alter table public.turmas add column if not exists plano_nome        text;
alter table public.turmas add column if not exists plano_ate         date;
alter table public.turmas add column if not exists cota_gratis_bytes bigint; -- cota antes do plano

-- Cota que vale HOJE (se o plano venceu, volta para a cota grátis)
create or replace function public.cota_efetiva(p_turma uuid)
returns bigint language sql stable security definer set search_path = ''
as $$
  select case
           when t.plano_ate is not null
                and t.plano_ate < (now() at time zone 'America/Sao_Paulo')::date
             then coalesce(t.cota_gratis_bytes, 0)
           else t.cota_bytes
         end
  from public.turmas t where t.id = p_turma;
$$;

-- A trava do upload passa a usar a cota que vale hoje
create or replace function public.turma_tem_espaco(p_turma uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.espaco_turma(p_turma) < coalesce(public.cota_efetiva(p_turma), 0);
$$;

-- A barra da turma também mostra o plano
create or replace function public.espaco_da_turma(p_turma uuid)
returns json language plpgsql stable security definer set search_path = ''
as $$
declare
  t public.turmas%rowtype;
begin
  if not public.eh_membro_turma(p_turma) then
    raise exception 'Você não faz parte desta turma.';
  end if;
  select * into t from public.turmas where id = p_turma;
  return json_build_object(
    'usado',   public.espaco_turma(p_turma),
    'cota',    public.cota_efetiva(p_turma),
    'plano',   t.plano_nome,
    'plano_ate', t.plano_ate,
    'vencido', t.plano_ate is not null
               and t.plano_ate < (now() at time zone 'America/Sao_Paulo')::date
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 3) FUNÇÕES DO PAINEL (todas recusam quem não é admin)
-- ---------------------------------------------------------------------

-- Tudo o que o painel mostra, de uma vez
create or replace function public.admin_painel()
returns json language plpgsql stable security definer set search_path = ''
as $$
declare
  cfg public.app_config%rowtype;
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  select * into cfg from public.app_config where id = 1;

  return json_build_object(
    'config', json_build_object(
      'capacidade', cfg.capacidade_total_bytes,
      'cota_padrao', cfg.cota_padrao_bytes
    ),
    'resumo', json_build_object(
      'usuarios',   (select count(*) from auth.users),
      'turmas',     (select count(*) from public.turmas),
      'provas',     (select count(*) from public.provas),
      'materiais',  (select count(*) from public.materiais),
      'comentarios',(select count(*) from public.comentarios),
      'usado_total', public.espaco_usado(),
      'alocado',    (select coalesce(sum(cota_bytes), 0) from public.turmas)
    ),
    'turmas', coalesce((
      select json_agg(x order by x.criada_em)
      from (
        select
          t.id,
          t.nome,
          t.codigo_convite as codigo,
          t.created_at as criada_em,
          t.cota_bytes as cota,
          public.cota_efetiva(t.id) as cota_efetiva,
          t.cota_gratis_bytes as cota_gratis,
          t.plano_nome as plano,
          t.plano_ate,
          public.espaco_turma(t.id) as usado,
          (select count(*) from public.turma_membros m where m.turma_id = t.id) as membros,
          (select count(*) from public.provas p where p.turma_id = t.id) as provas,
          (select pr.nome from public.profiles pr where pr.id = t.criada_por) as criador
        from public.turmas t
      ) x
    ), '[]'::json)
  );
end;
$$;

-- Ajustar a cota de uma turma.
--  • Com p_plano_nome: ativa/renova um PLANO até p_plano_ate (guarda a cota grátis)
--  • Sem p_plano_nome: muda a cota grátis da turma (sem plano)
create or replace function public.admin_definir_cota(
  p_turma uuid, p_cota_bytes bigint, p_plano_nome text default null, p_plano_ate date default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  t public.turmas%rowtype;
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  if p_cota_bytes is null or p_cota_bytes < 0 then
    raise exception 'Cota inválida.';
  end if;
  select * into t from public.turmas where id = p_turma;
  if t.id is null then
    raise exception 'Turma não encontrada.';
  end if;

  if nullif(trim(coalesce(p_plano_nome, '')), '') is not null then
    if p_plano_ate is null then
      raise exception 'Informe até quando o plano vale.';
    end if;
    update public.turmas set
      cota_gratis_bytes = case when t.plano_nome is null then t.cota_bytes else t.cota_gratis_bytes end,
      cota_bytes = p_cota_bytes,
      plano_nome = trim(p_plano_nome),
      plano_ate  = p_plano_ate
    where id = p_turma;
  else
    update public.turmas set
      cota_bytes = p_cota_bytes,
      cota_gratis_bytes = null,
      plano_nome = null,
      plano_ate  = null
    where id = p_turma;
  end if;
end;
$$;

-- Encerrar o plano agora (volta para a cota grátis que tinha antes)
create or replace function public.admin_remover_plano(p_turma uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  update public.turmas set
    cota_bytes = coalesce(cota_gratis_bytes, cota_bytes),
    cota_gratis_bytes = null,
    plano_nome = null,
    plano_ate  = null
  where id = p_turma;
end;
$$;

-- Capacidade total do app e cota padrão das turmas novas
create or replace function public.admin_config(p_capacidade bigint, p_cota_padrao bigint)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  if p_capacidade <= 0 or p_cota_padrao < 0 then
    raise exception 'Valores inválidos.';
  end if;
  update public.app_config
     set capacidade_total_bytes = p_capacidade, cota_padrao_bytes = p_cota_padrao
   where id = 1;
end;
$$;

-- Permissões: só usuários logados chamam (e as funções conferem se é admin)
revoke execute on function
  public.eh_admin_app(), public.admin_painel(),
  public.admin_definir_cota(uuid, bigint, text, date),
  public.admin_remover_plano(uuid), public.admin_config(bigint, bigint)
from anon, public;
grant execute on function
  public.eh_admin_app(), public.admin_painel(),
  public.admin_definir_cota(uuid, bigint, text, date),
  public.admin_remover_plano(uuid), public.admin_config(bigint, bigint)
to authenticated;

-- Conferência: deve mostrar 1 linha com o seu nome
select p.nome as admin_do_app
from public.app_admins a join public.profiles p on p.id = a.user_id;
