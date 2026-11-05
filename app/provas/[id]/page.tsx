// Página da prova: a "pasta coletiva" com todo o material, por aula
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Avatar } from "@/components/Avatar";
import { Contagem } from "@/components/Contagem";
import { ConteudoMaterial } from "@/components/ConteudoMaterial";
import { BotaoImportante } from "@/components/BotaoImportante";
import { BarraEspaco } from "@/components/BarraEspaco";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { apagarProva } from "@/app/acoes";
import { dataLonga, quando } from "@/lib/datas";
import { INFO_TIPO } from "@/lib/midia";
import { linksTemporarios } from "@/lib/urls";
import type { Material } from "@/lib/tipos";

type MaterialLista = Material & {
  profiles: { nome: string; avatar_url: string | null } | null;
  importantes: { user_id: string }[];
  comentarios: { count: number }[];
};

export default async function PaginaProva({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await exigirLogin();

  const { data: prova } = await supabase
    .from("provas")
    .select("*, turmas ( nome ), grupos ( nome )")
    .eq("id", id)
    .maybeSingle();
  if (!prova) notFound();

  const [{ data: materiaisBrutos }, { data: eu }] = await Promise.all([
    supabase
      .from("materiais")
      // "!materiais_autor_id_fkey" = o perfil do AUTOR (há outros caminhos até profiles)
      .select("*, profiles!materiais_autor_id_fkey ( nome, avatar_url ), importantes ( user_id ), comentarios ( count )")
      .eq("prova_id", id)
      .order("created_at"),
    supabase.from("turma_membros").select("papel").eq("turma_id", prova.turma_id).eq("user_id", user.id).maybeSingle(),
  ]);
  const materiais = (materiaisBrutos ?? []) as unknown as MaterialLista[];
  const links = await linksTemporarios(supabase, materiais.map((m) => m.arquivo_path));

  // Agrupa por aula (sem número vai para o fim)
  const grupos = new Map<number | null, MaterialLista[]>();
  for (const m of materiais) {
    const k = m.aula_numero;
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  const ordemAulas = [...grupos.keys()].sort((a, b) => (a ?? 9999) - (b ?? 9999));

  const podeApagar = prova.criado_por === user.id || eu?.papel === "admin";
  const nomeTurma = (prova.turmas as { nome: string } | null)?.nome ?? "";
  const nomeGrupo = (prova.grupos as { nome: string } | null)?.nome;
  const caminho = `/provas/${id}`;

  return (
    <>
      <Cabecalho
        titulo={prova.nome}
        subtitulo={nomeGrupo ? `${nomeTurma} · 👥 ${nomeGrupo}` : nomeTurma}
        voltarPara={nomeGrupo ? `/turmas/${prova.turma_id}/grupos/${prova.grupo_id}` : `/turmas/${prova.turma_id}`}
      />

      <main className="space-y-6 px-4 py-6 pb-28">
        <section className="cartao space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-stone-900">{prova.materia}</p>
              {prova.professor && <p className="text-sm text-stone-600">{prova.professor}</p>}
            </div>
            <Contagem data={prova.data} grande />
          </div>
          <p className="text-sm text-stone-500">📅 {dataLonga(prova.data)}</p>
          <p className="text-sm text-stone-500">
            📎 {materiais.length} {materiais.length === 1 ? "material" : "materiais"}
          </p>
          {materiais.length > 0 && (
            <Link href={`/provas/${id}/estudo`} className="botao mt-2 bg-stone-900 hover:bg-stone-800">
              📖 Modo estudo
            </Link>
          )}
        </section>

        {materiais.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-500">
            <p className="text-4xl">🗂️</p>
            <p className="mt-2">A pasta está vazia. Poste a primeira foto do quadro, um PDF ou uma anotação!</p>
          </div>
        )}

        {ordemAulas.map((aula) => {
          const itens = grupos.get(aula)!;
          const tema = itens.find((m) => m.tema)?.tema;
          return (
            <section key={aula ?? "sem"} className="space-y-3">
              <h2 className="sticky top-[65px] z-[5] -mx-4 bg-papel/95 px-4 py-2 text-sm font-bold text-vinho-700 backdrop-blur">
                {aula !== null ? `Aula ${aula}` : "Sem aula definida"}
                {tema && <span className="font-medium text-stone-500"> · {tema}</span>}
              </h2>

              {itens.map((m) => {
                const autor = m.profiles;
                const total = m.importantes.length;
                const marcado = m.importantes.some((i) => i.user_id === user.id);
                const qtdComentarios = m.comentarios?.[0]?.count ?? 0;
                return (
                  <article key={m.id} className="cartao space-y-3">
                    <header className="flex items-center gap-2">
                      <Avatar nome={autor?.nome ?? "?"} url={autor?.avatar_url} tamanho={28} />
                      <div className="min-w-0 flex-1 text-xs text-stone-500">
                        <span className="font-medium text-stone-700">{autor?.nome}</span> · {quando(m.created_at)}
                      </div>
                      <span className="text-xs text-stone-500">
                        {INFO_TIPO[m.tipo].icone} {INFO_TIPO[m.tipo].rotulo}
                      </span>
                    </header>

                    <Link href={`/materiais/${m.id}`} className="block font-semibold text-stone-900 hover:underline">
                      {m.titulo}
                    </Link>
                    {m.tema && m.tema !== tema && <p className="-mt-2 text-xs text-stone-500">{m.tema}</p>}

                    <ConteudoMaterial m={m} url={m.arquivo_path ? links[m.arquivo_path] : undefined} resumido />

                    <footer className="flex items-center gap-2">
                      <BotaoImportante materialId={m.id} total={total} marcado={marcado} caminho={caminho} />
                      <Link
                        href={`/materiais/${m.id}#comentarios`}
                        className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200"
                      >
                        💬 {qtdComentarios > 0 ? qtdComentarios : "Comentar"}
                      </Link>
                    </footer>
                  </article>
                );
              })}
            </section>
          );
        })}

        <BarraEspaco />

        {podeApagar && (
          <form action={apagarProva}>
            <input type="hidden" name="prova_id" value={id} />
            <BotaoConfirmar
              mensagem="Apagar esta prova e TODO o material dela? Não dá para desfazer."
              className="w-full py-2 text-sm text-red-600 hover:underline"
            >
              Apagar esta prova e todo o material dela
            </BotaoConfirmar>
          </form>
        )}
      </main>

      {/* Botão flutuante para postar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg p-4">
        <Link href={`/provas/${id}/novo`} className="botao pointer-events-auto py-4 text-base shadow-lg">
          ＋ Adicionar material
        </Link>
      </div>
    </>
  );
}
