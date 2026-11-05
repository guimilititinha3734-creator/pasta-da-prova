// MODO ESTUDO: busca tudo da prova no servidor e entrega para a tela interativa
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Contagem } from "@/components/Contagem";
import { linksTemporarios } from "@/lib/urls";
import type { Material } from "@/lib/tipos";
import { ModoEstudo, type ItemEstudo } from "./modo-estudo";

export const metadata = { title: "Modo estudo · Pasta da Prova" };

export default async function PaginaEstudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await exigirLogin();

  const { data: prova } = await supabase.from("provas").select("id, nome, materia, data").eq("id", id).maybeSingle();
  if (!prova) notFound();

  const [{ data: brutos }, { data: estudados }] = await Promise.all([
    supabase
      .from("materiais")
      .select("*, profiles!materiais_autor_id_fkey ( nome ), importantes ( user_id ), comentarios ( count )")
      .eq("prova_id", id)
      .order("created_at"),
    // o RLS só devolve o MEU checklist
    supabase.from("estudados").select("material_id").eq("user_id", user.id),
  ]);

  const materiais = (brutos ?? []) as unknown as (Material & {
    profiles: { nome: string } | null;
    importantes: { user_id: string }[];
    comentarios: { count: number }[];
  })[];
  const links = await linksTemporarios(supabase, materiais.map((m) => m.arquivo_path));

  // Ordem de estudo: aula 1, 2, 3… (sem número no fim), depois data de postagem
  materiais.sort(
    (a, b) => (a.aula_numero ?? 9999) - (b.aula_numero ?? 9999) || a.created_at.localeCompare(b.created_at),
  );

  const itens: ItemEstudo[] = materiais.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    titulo: m.titulo,
    texto: m.texto,
    link_url: m.link_url,
    aula_numero: m.aula_numero,
    tema: m.tema,
    autor: m.profiles?.nome ?? "",
    url: m.arquivo_path ? links[m.arquivo_path] : undefined,
    importantes: m.importantes.length,
    comentarios: m.comentarios?.[0]?.count ?? 0,
  }));

  return (
    <>
      <Cabecalho
        titulo={`📖 ${prova.nome}`}
        subtitulo={`Modo estudo · ${prova.materia}`}
        voltarPara={`/provas/${id}`}
        direita={<Contagem data={prova.data} />}
      />
      <ModoEstudo
        provaId={id}
        userId={user.id}
        itens={itens}
        estudadosIniciais={(estudados ?? []).map((e) => e.material_id)}
      />
    </>
  );
}
