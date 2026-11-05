-- =====================================================================
-- PASTA DA PROVA — ETAPA 7: admin pode excluir turmas abandonadas
--
-- Como usar: SQL Editor > New query > cole TODO este arquivo > Run.
-- ✅ Este arquivo NÃO apaga dados. Pode rodar de novo sem problema.
-- (Precisa que o 04_painel_admin.sql já tenha sido rodado.)
--
-- O que muda:
--  • O painel mostra a última atividade de cada turma (para achar
--    turmas abandonadas)
--  • O admin do app pode apagar os arquivos e a turma inteira
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) O admin do app também pode apagar arquivos do Storage
-- ---------------------------------------------------------------------
drop policy if exists "dono ou admin apaga arquivo" on storage.objects;

create policy "dono ou admin apaga arquivo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais' and (
    owner_id = (select auth.uid()::text)
    or public.eh_admin_turma(public.turma_da_prova(public.prova_do_caminho(name)))
    or public.eh_admin_app()
  ));

-- ---------------------------------------------------------------------
-- 2) Lista TODOS os arquivos de uma turma (inclusive os "perdidos")
-- ---------------------------------------------------------------------
create or replace function public.admin_arquivos_turma(p_turma uuid)
returns setof text language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  return query
    select o.name
    from storage.objects o
    join public.provas p on p.id = public.prova_do_caminho(o.name)
    where o.bucket_id = 'materiais' and p.turma_id = p_turma;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Apaga a turma (grupos, provas, materiais, comentários e membros
--    vão junto automaticamente)
-- ---------------------------------------------------------------------
create or replace function public.admin_apagar_turma(p_turma uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  delete from public.turmas where id = p_turma;
end;
$$;

-- ---------------------------------------------------------------------
-- 4) Painel com "última atividade" de cada turma
-- ---------------------------------------------------------------------
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
          (select count(*) from public.materiais ma
             join public.provas p on p.id = ma.prova_id where p.turma_id = t.id) as materiais,
          (select pr.nome from public.profiles pr where pr.id = t.criada_por) as criador,
          -- última coisa que aconteceu na turma
          greatest(
            t.created_at,
            (select max(m.entrou_em) from public.turma_membros m where m.turma_id = t.id),
            (select max(p.created_at) from public.provas p where p.turma_id = t.id),
            (select max(ma.created_at) from public.materiais ma
               join public.provas p on p.id = ma.prova_id where p.turma_id = t.id),
            (select max(c.created_at) from public.comentarios c
               join public.materiais ma on ma.id = c.material_id
               join public.provas p on p.id = ma.prova_id where p.turma_id = t.id)
          ) as ultima_atividade
        from public.turmas t
      ) x
    ), '[]'::json)
  );
end;
$$;

revoke execute on function public.admin_arquivos_turma(uuid), public.admin_apagar_turma(uuid) from anon, public;
grant execute on function public.admin_arquivos_turma(uuid), public.admin_apagar_turma(uuid) to authenticated;
