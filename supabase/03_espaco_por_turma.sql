-- =====================================================================
-- PASTA DA PROVA — ETAPA 5: espaço de arquivos SEPARADO por turma
--
-- Como usar: SQL Editor > New query > cole TODO este arquivo > Run.
-- ✅ Este arquivo NÃO apaga nada. Pode rodar de novo sem perder dados.
--
-- Como funciona:
--  • O app inteiro tem uma CAPACIDADE (plano grátis do Supabase = 1 GB).
--  • Cada turma nova recebe uma COTA (padrão: 200 MB), enquanto houver
--    capacidade sobrando. Ex.: 5 turmas × 200 MB = 1000 MB.
--  • Quando a capacidade acaba, turmas novas são criadas com cota 0:
--    podem postar anotações e links, mas não fotos/vídeos/PDFs, até
--    você aumentar a cota delas (ex.: quando pagarem um plano).
--  • A "Turma de Exemplo" ganha só 2 MB (o suficiente para as fotos dela).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) CONFIGURAÇÃO GERAL (uma linha só; só você altera, pelo painel)
-- ---------------------------------------------------------------------
create table if not exists public.app_config (
  id                      int primary key default 1 check (id = 1),
  capacidade_total_bytes  bigint not null,  -- tamanho total do "prédio"
  cota_padrao_bytes       bigint not null,  -- "armário" de cada turma nova
  cota_exemplo_bytes      bigint not null   -- turma de exemplo
);
alter table public.app_config enable row level security;  -- ninguém do app lê/edita

insert into public.app_config (id, capacidade_total_bytes, cota_padrao_bytes, cota_exemplo_bytes)
values (1, 1073741824, 209715200, 2097152)   -- 1 GB, 200 MB, 2 MB
on conflict (id) do nothing;                  -- se você já mudou, mantém

-- ---------------------------------------------------------------------
-- 2) COTA DE CADA TURMA
-- ---------------------------------------------------------------------
alter table public.turmas add column if not exists cota_bytes bigint not null default 0;

-- Membros/admin da turma podem mudar SÓ o nome — nunca a própria cota
revoke update on public.turmas from authenticated, anon;
grant update (nome) on public.turmas to authenticated;

-- Ao criar uma turma, define a cota automaticamente
create or replace function public.definir_cota_turma()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  cfg      public.app_config%rowtype;
  alocado  bigint;
begin
  select * into cfg from public.app_config where id = 1;

  if new.nome like 'Turma de Exemplo%' then
    new.cota_bytes := cfg.cota_exemplo_bytes;
    return new;
  end if;

  select coalesce(sum(cota_bytes), 0) into alocado from public.turmas;
  if alocado + cfg.cota_padrao_bytes <= cfg.capacidade_total_bytes then
    new.cota_bytes := cfg.cota_padrao_bytes;
  else
    new.cota_bytes := 0;  -- capacidade grátis esgotada: precisa de plano
  end if;
  return new;
end;
$$;

drop trigger if exists ao_criar_turma_definir_cota on public.turmas;
create trigger ao_criar_turma_definir_cota
  before insert on public.turmas
  for each row execute function public.definir_cota_turma();

-- Turmas que JÁ existem: distribui as cotas por ordem de criação
-- (só para as que ainda estão com cota 0 — não mexe em quem já tem)
do $$
declare
  cfg      public.app_config%rowtype;
  t        record;
  alocado  bigint;
begin
  select * into cfg from public.app_config where id = 1;
  for t in select id, nome from public.turmas where cota_bytes = 0 order by created_at loop
    select coalesce(sum(cota_bytes), 0) into alocado from public.turmas;
    if t.nome like 'Turma de Exemplo%' then
      update public.turmas set cota_bytes = cfg.cota_exemplo_bytes where id = t.id;
    elsif alocado + cfg.cota_padrao_bytes <= cfg.capacidade_total_bytes then
      update public.turmas set cota_bytes = cfg.cota_padrao_bytes where id = t.id;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) QUANTO CADA TURMA JÁ USOU (soma o tamanho real dos arquivos)
-- Caminho do arquivo = "<prova_id>/arquivo" → prova → turma
-- ---------------------------------------------------------------------
create or replace function public.espaco_turma(p_turma uuid)
returns bigint language sql stable security definer set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  join public.provas p on p.id = public.prova_do_caminho(o.name)
  where o.bucket_id = 'materiais' and p.turma_id = p_turma;
$$;

create or replace function public.turma_tem_espaco(p_turma uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.espaco_turma(p_turma) < coalesce(
    (select cota_bytes from public.turmas where id = p_turma), 0);
$$;

-- Para a barra do app: só membros da turma podem consultar
create or replace function public.espaco_da_turma(p_turma uuid)
returns json language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.eh_membro_turma(p_turma) then
    raise exception 'Você não faz parte desta turma.';
  end if;
  return json_build_object(
    'usado', public.espaco_turma(p_turma),
    'cota',  (select cota_bytes from public.turmas where id = p_turma)
  );
end;
$$;

revoke execute on function public.espaco_da_turma(uuid) from anon, public;
grant execute on function public.espaco_da_turma(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4) A TRAVA: o Storage recusa upload de turma sem espaço
-- (o banco confere — não dá para burlar pelo app)
-- ---------------------------------------------------------------------
drop policy if exists "enviar arquivo para minha prova" on storage.objects;

create policy "enviar arquivo para minha prova" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'materiais'
    and public.pode_ver_prova(public.prova_do_caminho(name))
    and public.turma_tem_espaco(public.turma_da_prova(public.prova_do_caminho(name)))
  );

-- =====================================================================
-- COMANDOS ÚTEIS PARA VOCÊ (dono do app) — rode só a linha que precisar
-- =====================================================================
-- Ver todas as turmas, cota e uso:
--   select nome, codigo_convite, cota_bytes/1048576 as cota_mb,
--          public.espaco_turma(id)/1048576 as usado_mb
--   from public.turmas order by created_at;
--
-- Dar 1 GB para uma turma (troque o código):
--   update public.turmas set cota_bytes = 1073741824 where codigo_convite = 'DIR-XXXX';
--
-- Quando assinar o Supabase Pro (100 GB) e quiser 1 GB por turma nova:
--   update public.app_config set capacidade_total_bytes = 107374182400,
--                                cota_padrao_bytes = 1073741824 where id = 1;
-- =====================================================================
