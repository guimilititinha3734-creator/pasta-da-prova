// Página "Adicionar material" de uma prova
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { FormularioMaterial } from "./formulario";

export default async function NovoMaterial({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { id } = await params;
  const { tipo } = await searchParams;
  const { supabase } = await exigirLogin();

  const { data: prova } = await supabase.from("provas").select("id, nome, materia, turma_id").eq("id", id).maybeSingle();
  if (!prova) notFound();

  // Aula/tema já usados nesta prova (sugestões) + espaço da TURMA
  const [{ data: anteriores }, { data: espaco }] = await Promise.all([
    supabase.from("materiais").select("aula_numero, tema").eq("prova_id", id).order("created_at", { ascending: false }),
    supabase.rpc("espaco_da_turma", { p_turma: prova.turma_id }),
  ]);
  const { usado = 0, cota = 0 } = (espaco ?? {}) as { usado?: number; cota?: number };

  const temas = [...new Set((anteriores ?? []).map((a) => a.tema).filter(Boolean))] as string[];
  const ultimaAula = (anteriores ?? []).find((a) => a.aula_numero !== null)?.aula_numero ?? null;

  return (
    <>
      <Cabecalho titulo="Adicionar material" subtitulo={`${prova.nome} · ${prova.materia}`} voltarPara={`/provas/${id}`} />
      <main className="px-4 py-6">
        <FormularioMaterial
          provaId={id}
          temasSugeridos={temas}
          ultimaAula={ultimaAula}
          espacoUsado={Number(usado)}
          espacoCota={Number(cota)}
          tipoInicial={tipo}
        />
      </main>
    </>
  );
}
