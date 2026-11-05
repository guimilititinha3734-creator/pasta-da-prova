-- =====================================================================
-- PASTA DA PROVA — ETAPA 2: provas, materiais, comentários e arquivos
-- Como usar: SQL Editor > cole TODO este arquivo > Run.
-- Pode rodar de novo: ele apaga e recria as tabelas desta etapa
-- (o material já postado se perde!). A etapa 1 não é afetada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) LIMPEZA (para poder rodar de novo)
-- ---------------------------------------------------------------------
drop table if exists public.estudados   cascade;
drop table if exists public.importantes cascade;
drop table if exists public.comentarios cascade;
drop table if exists public.materiais   cascade;
drop table if exists public.provas      cascade;

-- ---------------------------------------------------------------------
-- 1) TABELAS
-- ---------------------------------------------------------------------

-- Cada prova é uma "pasta". Se grupo_id estiver vazio, é da turma toda.
create table public.provas (
  id          uuid primary key default gen_random_uuid(),
  turma_id    uuid not null references public.turmas (id) on delete cascade,
  grupo_id    uuid references public.grupos (id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 80),
  materia     text not null check (char_length(materia) between 2 and 80),
  professor   text not null default '',
  data        date not null,
  criado_por  uuid not null references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Tudo o que a turma posta dentro de uma prova
create table public.materiais (
  id             uuid primary key default gen_random_uuid(),
  prova_id       uuid not null references public.provas (id) on delete cascade,
  autor_id       uuid not null references public.profiles (id) default auth.uid(),
  tipo           text not null check (tipo in ('foto', 'video', 'video_link', 'pdf', 'nota')),
  titulo         text not null check (char_length(titulo) between 1 and 120),
  aula_numero    int check (aula_numero between 0 and 999),
  tema           text not null default '',
  texto          text not null default '' check (char_length(texto) <= 20000),
  arquivo_path   text,          -- caminho no Storage (foto, vídeo, PDF)
  link_url       text,          -- YouTube / Google Drive
  tamanho_bytes  bigint not null default 0,
  created_at     timestamptz not null default now(),
  -- cada tipo precisa do seu conteúdo
  check (
    (tipo in ('foto', 'video', 'pdf') and arquivo_path is not null) or
    (tipo = 'video_link' and link_url ~ '^https?://') or
    (tipo = 'nota' and char_length(texto) > 0)
  )
);

create table public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiais (id) on delete cascade,
  autor_id    uuid not null references public.profiles (id) default auth.uid(),
  texto       text not null check (char_length(texto) between 1 and 2000),
  created_at  timestamptz not null default now()
);

-- "Importante": cada pessoa marca uma vez; o app mostra o total
create table public.importantes (
  material_id uuid not null references public.materiais (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  primary key (material_id, user_id)
);

-- Checklist pessoal "já estudei" (usado no modo estudo, etapa 3)
create table public.estudados (
  material_id uuid not null references public.materiais (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  primary key (material_id, user_id)
);

create index on public.provas (turma_id);
create index on public.provas (grupo_id);
create index on public.materiais (prova_id);
create index on public.comentarios (material_id);

-- ---------------------------------------------------------------------
-- 2) FUNÇÕES AUXILIARES DE SEGURANÇA
-- ---------------------------------------------------------------------

-- Posso ver esta prova? (turma toda -> sou da turma; grupo -> sou do grupo)
create or replace function public.pode_ver_prova(p_prova uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.provas p
    where p.id = p_prova
      and (
        (p.grupo_id is null and public.eh_membro_turma(p.turma_id)) or
        (p.grupo_id is not null and public.eh_membro_grupo(p.grupo_id))
      )
  );
$$;

create or replace function public.turma_da_prova(p_prova uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select turma_id from public.provas where id = p_prova;
$$;

create or replace function public.prova_do_material(p_material uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  select prova_id from public.materiais where id = p_material;
$$;

-- Converte o 1º pedaço do caminho do arquivo ("<prova_id>/arquivo.jpg")
-- em uuid sem dar erro se vier algo estranho
create or replace function public.prova_do_caminho(p_nome text)
returns uuid language plpgsql immutable set search_path = ''
as $$
begin
  return split_part(p_nome, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.provas      enable row level security;
alter table public.materiais   enable row level security;
alter table public.comentarios enable row level security;
alter table public.importantes enable row level security;
alter table public.estudados   enable row level security;

-- PROVAS
create policy "ver provas permitidas" on public.provas
  for select to authenticated
  using (
    (grupo_id is null and public.eh_membro_turma(turma_id)) or
    (grupo_id is not null and public.eh_membro_grupo(grupo_id))
  );

create policy "criar prova na turma ou no meu grupo" on public.provas
  for insert to authenticated
  with check (
    criado_por = auth.uid() and (
      (grupo_id is null and public.eh_membro_turma(turma_id)) or
      (grupo_id is not null and public.eh_membro_grupo(grupo_id)
        and public.turma_do_grupo(grupo_id) = turma_id)
    )
  );

create policy "criador ou admin edita prova" on public.provas
  for update to authenticated
  using (criado_por = auth.uid() or public.eh_admin_turma(turma_id))
  with check (criado_por = auth.uid() or public.eh_admin_turma(turma_id));

create policy "criador ou admin apaga prova" on public.provas
  for delete to authenticated
  using (criado_por = auth.uid() or public.eh_admin_turma(turma_id));

-- MATERIAIS
create policy "ver materiais das minhas provas" on public.materiais
  for select to authenticated
  using (public.pode_ver_prova(prova_id));

create policy "postar material" on public.materiais
  for insert to authenticated
  with check (autor_id = auth.uid() and public.pode_ver_prova(prova_id));

create policy "autor edita material" on public.materiais
  for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid() and public.pode_ver_prova(prova_id));

create policy "autor ou admin apaga material" on public.materiais
  for delete to authenticated
  using (autor_id = auth.uid() or public.eh_admin_turma(public.turma_da_prova(prova_id)));

-- COMENTÁRIOS
create policy "ver comentários" on public.comentarios
  for select to authenticated
  using (public.pode_ver_prova(public.prova_do_material(material_id)));

create policy "comentar" on public.comentarios
  for insert to authenticated
  with check (autor_id = auth.uid()
              and public.pode_ver_prova(public.prova_do_material(material_id)));

create policy "autor apaga comentário" on public.comentarios
  for delete to authenticated
  using (autor_id = auth.uid());

-- IMPORTANTES (todos da prova veem a contagem; cada um marca o seu)
create policy "ver importantes" on public.importantes
  for select to authenticated
  using (public.pode_ver_prova(public.prova_do_material(material_id)));

create policy "marcar importante" on public.importantes
  for insert to authenticated
  with check (user_id = auth.uid()
              and public.pode_ver_prova(public.prova_do_material(material_id)));

create policy "desmarcar importante" on public.importantes
  for delete to authenticated
  using (user_id = auth.uid());

-- ESTUDADOS (só a própria pessoa vê o seu checklist)
create policy "ver meu checklist" on public.estudados
  for select to authenticated using (user_id = auth.uid());

create policy "marcar estudado" on public.estudados
  for insert to authenticated
  with check (user_id = auth.uid()
              and public.pode_ver_prova(public.prova_do_material(material_id)));

create policy "desmarcar estudado" on public.estudados
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) ARQUIVOS (Supabase Storage)
-- Bucket PRIVADO "materiais". Cada arquivo fica em "<prova_id>/<nome>".
-- Limite de 25 MB por arquivo (o plano grátis aceita até 50 MB).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materiais', 'materiais', false, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
        'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ver arquivos das minhas provas" on storage.objects;
drop policy if exists "enviar arquivo para minha prova" on storage.objects;
drop policy if exists "dono ou admin apaga arquivo" on storage.objects;

create policy "ver arquivos das minhas provas" on storage.objects
  for select to authenticated
  using (bucket_id = 'materiais'
         and public.pode_ver_prova(public.prova_do_caminho(name)));

create policy "enviar arquivo para minha prova" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais'
              and public.pode_ver_prova(public.prova_do_caminho(name)));

create policy "dono ou admin apaga arquivo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materiais' and (
    owner_id = (select auth.uid()::text)
    or public.eh_admin_turma(public.turma_da_prova(public.prova_do_caminho(name)))
  ));

-- ---------------------------------------------------------------------
-- 5) ESPAÇO USADO (o 1 GB grátis é um só para o app inteiro)
-- ---------------------------------------------------------------------
create or replace function public.espaco_usado()
returns bigint language sql stable security definer set search_path = ''
as $$
  select coalesce(sum((metadata ->> 'size')::bigint), 0)
  from storage.objects
  where bucket_id = 'materiais';
$$;

revoke execute on function public.espaco_usado() from anon, public;
grant execute on function public.espaco_usado() to authenticated;

-- ---------------------------------------------------------------------
-- 6) DADOS DE EXEMPLO
-- Cria, para quem chamar, uma turma de exemplo com grupo, 3 provas,
-- anotações, links de vídeo, comentários e "importantes".
-- (As fotos de exemplo são desenhadas e enviadas pelo próprio app.)
-- ---------------------------------------------------------------------
create or replace function public.carregar_exemplo()
returns json language plpgsql security definer set search_path = ''
as $$
declare
  eu        uuid := auth.uid();
  v_turma   uuid;
  v_grupo   uuid;
  p_const   uuid;
  p_civil   uuid;
  p_penal   uuid;
  m         uuid;
begin
  if eu is null then
    raise exception 'Faça login primeiro.';
  end if;

  insert into public.turmas (nome, codigo_convite, criada_por)
  values ('Turma de Exemplo — Direito', public.gerar_codigo_convite(), eu)
  returning id into v_turma;
  insert into public.turma_membros (turma_id, user_id, papel) values (v_turma, eu, 'admin');

  insert into public.grupos (turma_id, nome, criado_por)
  values (v_turma, 'Grupo da P1', eu) returning id into v_grupo;
  insert into public.grupo_membros (grupo_id, user_id) values (v_grupo, eu);

  -- PROVA 1: Constitucional (turma toda), daqui a 12 dias
  insert into public.provas (turma_id, nome, materia, professor, data, criado_por)
  values (v_turma, 'P1 — Constitucional', 'Direito Constitucional', 'Profa. Helena Duarte',
          (now() at time zone 'America/Sao_Paulo')::date + 12, eu)
  returning id into p_const;

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto) values
  (p_const, eu, 'nota', 'Resumo: o que é Constituição', 1, 'Teoria da Constituição',
   E'• Constituição = lei fundamental do Estado.\n• Classificações: quanto à forma (escrita × não escrita), à origem (promulgada × outorgada) e à estabilidade (rígida, flexível, semirrígida).\n• A CF/88 é: escrita, promulgada, rígida, analítica e dogmática.\n\n⚠️ A professora disse que "classificação da CF/88" cai TODO semestre.')
  returning id into m;
  insert into public.importantes (material_id, user_id) values (m, eu);
  insert into public.comentarios (material_id, autor_id, texto)
  values (m, eu, 'Alguém sabe se ela cobra a classificação de Pinto Ferreira também?');

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto) values
  (p_const, eu, 'nota', 'Poder Constituinte — esquema', 2, 'Poder Constituinte',
   E'ORIGINÁRIO: inicial, ilimitado (juridicamente), incondicionado, autônomo.\nDERIVADO:\n  – reformador (emendas, art. 60)\n  – decorrente (constituições estaduais)\n  – revisor (art. 3º ADCT — já exercido)\n\nLimites ao reformador: formais, circunstanciais (estado de sítio/defesa, intervenção federal) e materiais (cláusulas pétreas, art. 60 §4º).');

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto, link_url) values
  (p_const, eu, 'video_link', 'Vídeos sobre controle de constitucionalidade', 3, 'Controle de constitucionalidade',
   'Link de exemplo: uma busca no YouTube. Troque por um vídeo não listado da turma.',
   'https://www.youtube.com/results?search_query=controle+de+constitucionalidade+aula');

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto) values
  (p_const, eu, 'nota', 'Controle difuso × concentrado', 3, 'Controle de constitucionalidade',
   E'DIFUSO: qualquer juiz, caso concreto, efeito inter partes (em regra).\nCONCENTRADO: STF (ADI, ADC, ADPF, ADO), abstrato, efeito erga omnes e vinculante.\n\nDica: lembrar da cláusula de reserva de plenário (art. 97) e da Súmula Vinculante 10.')
  returning id into m;
  insert into public.importantes (material_id, user_id) values (m, eu);

  -- PROVA 2: Civil (só do grupo), daqui a 25 dias
  insert into public.provas (turma_id, grupo_id, nome, materia, professor, data, criado_por)
  values (v_turma, v_grupo, 'P1 — Civil (Parte Geral)', 'Direito Civil I', 'Prof. Marcos Lima',
          (now() at time zone 'America/Sao_Paulo')::date + 25, eu)
  returning id into p_civil;

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto) values
  (p_civil, eu, 'nota', 'Capacidade civil', 1, 'Pessoa natural',
   E'Absolutamente incapazes: só menores de 16 (art. 3º).\nRelativamente: 16–18, ébrios habituais/viciados, quem não pode exprimir vontade, pródigos (art. 4º).\n\nMudou com o Estatuto da Pessoa com Deficiência (Lei 13.146/15)!'),
  (p_civil, eu, 'nota', 'Defeitos do negócio jurídico', 2, 'Negócio jurídico',
   E'Erro, dolo, coação, estado de perigo, lesão, fraude contra credores → ANULÁVEIS (prazo decadencial de 4 anos, art. 178).\nSimulação → NULO (art. 167).');

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto, link_url) values
  (p_civil, eu, 'video_link', 'Aula gravada (exemplo de link do Drive)', 2, 'Negócio jurídico',
   'Exemplo de como fica um link do Google Drive. Este link não abre um vídeo real.',
   'https://drive.google.com/file/d/EXEMPLO/view');

  -- PROVA 3: Penal (turma toda), já aconteceu há 5 dias
  insert into public.provas (turma_id, nome, materia, professor, data, criado_por)
  values (v_turma, 'P1 — Penal I', 'Direito Penal I', 'Prof. Ricardo Alves',
          (now() at time zone 'America/Sao_Paulo')::date - 5, eu)
  returning id into p_penal;

  insert into public.materiais (prova_id, autor_id, tipo, titulo, aula_numero, tema, texto) values
  (p_penal, eu, 'nota', 'Teoria do crime (conceito analítico)', 1, 'Teoria do crime',
   E'Crime = fato típico + ilícito + culpável (teoria tripartida).\nFato típico: conduta, resultado, nexo causal, tipicidade.');

  return json_build_object('turma_id', v_turma, 'prova_id', p_const);
end;
$$;

revoke execute on function public.carregar_exemplo() from anon, public;
grant execute on function public.carregar_exemplo() to authenticated;
