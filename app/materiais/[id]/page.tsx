// Um material sozinho: conteúdo completo + comentários para tirar dúvidas
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Avatar } from "@/components/Avatar";
import { ConteudoMaterial } from "@/components/ConteudoMaterial";
import { BotaoImportante } from "@/components/BotaoImportante";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { apagarComentario, apagarMaterial } from "@/app/acoes";
import { quando } from "@/lib/datas";
import { formatarBytes, INFO_TIPO } from "@/lib/midia";
import { linksTemporarios } from "@/lib/urls";
import type { Material } from "@/lib/tipos";
import { FormularioComentario } from "./comentario";

type PerfilMini = { nome: string; avatar_url: string | null } | null;

export default async function PaginaMaterial({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await exigirLogin();

  const { data } = await supabase
    .from("materiais")
    .select("*, profiles!materiais_autor_id_fkey ( nome, avatar_url ), importantes ( user_id ), provas ( nome, turma_id )")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const m = data as unknown as Material & {
    profiles: PerfilMini;
    importantes: { user_id: string }[];
    provas: { nome: string; turma_id: string };
  };

  const [{ data: comentarios }, { data: eu }, links] = await Promise.all([
    supabase
      .from("comentarios")
      .select("id, texto, created_at, autor_id, profiles!comentarios_autor_id_fkey ( nome, avatar_url )")
      .eq("material_id", id)
      .order("created_at"),
    supabase.from("turma_membros").select("papel").eq("turma_id", m.provas.turma_id).eq("user_id", user.id).maybeSingle(),
    linksTemporarios(supabase, [m.arquivo_path]),
  ]);

  const podeApagar = m.autor_id === user.id || eu?.papel === "admin";
  const url = m.arquivo_path ? links[m.arquivo_path] : undefined;

  return (
    <>
      <Cabecalho titulo={m.titulo} subtitulo={m.provas.nome} voltarPara={`/provas/${m.prova_id}`} />

      <main className="space-y-6 px-4 py-6">
        <article className="space-y-4">
          <div className="flex items-center gap-2">
            <Avatar nome={m.profiles?.nome ?? "?"} url={m.profiles?.avatar_url} tamanho={36} />
            <div className="flex-1 text-sm">
              <p className="font-medium text-stone-800">{m.profiles?.nome}</p>
              <p className="text-xs text-stone-500">{quando(m.created_at)}</p>
            </div>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
              {INFO_TIPO[m.tipo].icone} {INFO_TIPO[m.tipo].rotulo}
            </span>
          </div>

          {(m.aula_numero !== null || m.tema) && (
            <p className="text-sm font-semibold text-vinho-700">
              {m.aula_numero !== null && `Aula ${m.aula_numero}`}
              {m.aula_numero !== null && m.tema && " · "}
              {m.tema}
            </p>
          )}

          <ConteudoMaterial m={m} url={url} />

          {m.tipo !== "nota" && m.tipo !== "video_link" && m.texto && (
            <p className="whitespace-pre-line text-stone-700">{m.texto}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <BotaoImportante
              materialId={m.id}
              total={m.importantes.length}
              marcado={m.importantes.some((i) => i.user_id === user.id)}
              caminho={`/materiais/${m.id}`}
            />
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200"
              >
                ⤢ Abrir em tela cheia
              </a>
            )}
            {m.tamanho_bytes > 0 && <span className="text-xs text-stone-400">{formatarBytes(m.tamanho_bytes)}</span>}
          </div>
        </article>

        <section id="comentarios" className="space-y-3 border-t border-stone-200 pt-6">
          <h2 className="font-bold text-stone-900">💬 Dúvidas e comentários ({comentarios?.length ?? 0})</h2>

          {comentarios?.map((c) => {
            const p = c.profiles as unknown as PerfilMini;
            return (
              <div key={c.id} className="flex gap-2">
                <Avatar nome={p?.nome ?? "?"} url={p?.avatar_url} tamanho={30} />
                <div className="flex-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                  <p className="text-xs text-stone-500">
                    <span className="font-semibold text-stone-700">{p?.nome}</span> · {quando(c.created_at)}
                  </p>
                  <p className="whitespace-pre-line text-[15px] text-stone-800">{c.texto}</p>
                  {c.autor_id === user.id && (
                    <form action={apagarComentario} className="text-right">
                      <input type="hidden" name="comentario_id" value={c.id} />
                      <input type="hidden" name="material_id" value={m.id} />
                      <button className="text-xs text-stone-400 hover:text-red-600">apagar</button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}

          <FormularioComentario materialId={m.id} />
        </section>

        {podeApagar && (
          <form action={apagarMaterial} className="pt-4">
            <input type="hidden" name="material_id" value={m.id} />
            <BotaoConfirmar
              mensagem="Apagar este material (e o arquivo dele)? Não dá para desfazer."
              className="w-full py-2 text-sm text-red-600 hover:underline"
            >
              Apagar este material
            </BotaoConfirmar>
          </form>
        )}
      </main>
    </>
  );
}
