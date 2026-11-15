-- =====================================================================
-- PASTA DA PROVA — ETAPA 9: novo tipo de material "Link"
-- (mapa mental interativo, Canva, Google Docs, site, Notion, etc.)
--
-- Como usar: SQL Editor > New query > cole TODO este arquivo > Run.
-- ✅ Este arquivo NÃO apaga nenhum material. Pode rodar de novo.
-- Ele só troca as "regras de validação" da tabela de materiais para
-- aceitar o tipo novo.
-- =====================================================================

-- Remove as regras antigas de tipo (os nomes foram gerados automaticamente)
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.materiais'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%video_link%'
  loop
    execute format('alter table public.materiais drop constraint %I', r.conname);
  end loop;
end;
$$;

-- Tipos aceitos (agora com "link")
alter table public.materiais
  add constraint materiais_tipo_valido
  check (tipo in ('foto', 'video', 'video_link', 'pdf', 'nota', 'link'));

-- Cada tipo precisa do seu conteúdo
alter table public.materiais
  add constraint materiais_conteudo_valido
  check (
    (tipo in ('foto', 'video', 'pdf') and arquivo_path is not null) or
    (tipo in ('video_link', 'link') and link_url ~ '^https?://') or
    (tipo = 'nota' and char_length(texto) > 0)
  );
