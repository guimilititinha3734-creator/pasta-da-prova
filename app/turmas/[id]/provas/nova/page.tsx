// Formulário "Nova prova"
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { FormularioProva } from "./formulario";

export default async function NovaProva({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { id } = await params;
  const { grupo } = await searchParams;
  const { supabase, user } = await exigirLogin();

  const { data: turma } = await supabase.from("turmas").select("id, nome").eq("id", id).maybeSingle();
  if (!turma) notFound();

  // Só os grupos dos quais EU participo (só posso criar prova neles)
  const { data: meusGrupos } = await supabase
    .from("grupos")
    .select("id, nome, grupo_membros!inner ( user_id )")
    .eq("turma_id", id)
    .eq("grupo_membros.user_id", user.id)
    .order("nome");

  return (
    <>
      <Cabecalho titulo="Nova prova" subtitulo={turma.nome} voltarPara={`/turmas/${id}`} />
      <main className="px-4 py-6">
        <FormularioProva
          turmaId={id}
          grupos={(meusGrupos ?? []).map((g) => ({ id: g.id, nome: g.nome }))}
          grupoInicial={grupo}
        />
      </main>
    </>
  );
}
