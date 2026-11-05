// Página do grupo: membros, adicionar colegas da turma, sair/apagar grupo
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaProvas, type ProvaResumo } from "@/components/ListaProvas";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Avatar } from "@/components/Avatar";
import { adicionarAoGrupo, apagarGrupo, removerDoGrupo } from "@/app/acoes";

type PerfilMini = { nome: string; avatar_url: string | null } | null;

export default async function PaginaGrupo({
  params,
}: {
  params: Promise<{ id: string; grupoId: string }>;
}) {
  const { id: turmaId, grupoId } = await params;
  const { supabase, user } = await exigirLogin();

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nome, criado_por, turma_id, turmas ( nome )")
    .eq("id", grupoId)
    .eq("turma_id", turmaId)
    .maybeSingle();
  if (!grupo) notFound();

  const [{ data: membrosGrupo }, { data: membrosTurma }, { data: provas }] = await Promise.all([
    supabase.from("grupo_membros").select("user_id, profiles ( nome, avatar_url )").eq("grupo_id", grupoId),
    supabase.from("turma_membros").select("user_id, papel, profiles ( nome, avatar_url )").eq("turma_id", turmaId),
    supabase
      .from("provas")
      .select("id, nome, materia, professor, data, grupo_id, materiais ( count )")
      .eq("grupo_id", grupoId),
  ]);

  const idsNoGrupo = new Set(membrosGrupo?.map((m) => m.user_id));
  const participo = idsNoGrupo.has(user.id);
  const souAdmin = membrosTurma?.some((m) => m.user_id === user.id && m.papel === "admin");
  const souCriador = grupo.criado_por === user.id;
  const podeGerenciar = participo || souAdmin;
  const foraDoGrupo = membrosTurma?.filter((m) => !idsNoGrupo.has(m.user_id)) ?? [];
  const nomeTurma = (grupo.turmas as unknown as { nome: string } | null)?.nome ?? "";

  const ocultos = (userId: string) => (
    <>
      <input type="hidden" name="grupo_id" value={grupoId} />
      <input type="hidden" name="turma_id" value={turmaId} />
      <input type="hidden" name="user_id" value={userId} />
    </>
  );

  return (
    <>
      <Cabecalho titulo={grupo.nome} subtitulo={nomeTurma} voltarPara={`/turmas/${turmaId}`} />

      <main className="space-y-8 px-4 py-6">
        {!participo && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Você não faz parte deste grupo. Peça para alguém do grupo te adicionar para ver as provas dele.
          </p>
        )}

        {participo && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Provas do grupo</h2>
              <Link
                href={`/turmas/${turmaId}/provas/nova?grupo=${grupoId}`}
                className="rounded-full bg-vinho-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-vinho-700"
              >
                ＋ Nova prova
              </Link>
            </div>
            {provas?.length ? (
              <ListaProvas provas={provas as unknown as ProvaResumo[]} />
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
                Nenhuma prova só deste grupo ainda.
              </p>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Membros ({membrosGrupo?.length ?? 0})
          </h2>
          <ul className="cartao divide-y divide-stone-100 p-0">
            {membrosGrupo?.map((m) => {
              const p = m.profiles as unknown as PerfilMini;
              const podeRemover = m.user_id !== user.id && (souCriador || souAdmin);
              return (
                <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar nome={p?.nome ?? "?"} url={p?.avatar_url} />
                  <span className="flex-1 truncate">
                    {p?.nome}
                    {m.user_id === user.id && <span className="text-stone-400"> (você)</span>}
                    {m.user_id === grupo.criado_por && <span className="text-stone-400"> · criou o grupo</span>}
                  </span>
                  {podeRemover && (
                    <form action={removerDoGrupo}>
                      {ocultos(m.user_id)}
                      <button className="text-sm text-red-600 hover:underline">Remover</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {podeGerenciar && foraDoGrupo.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Adicionar colegas da turma
            </h2>
            <ul className="cartao divide-y divide-stone-100 p-0">
              {foraDoGrupo.map((m) => {
                const p = m.profiles as unknown as PerfilMini;
                return (
                  <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar nome={p?.nome ?? "?"} url={p?.avatar_url} />
                    <span className="flex-1 truncate">{p?.nome}</span>
                    <form action={adicionarAoGrupo}>
                      {ocultos(m.user_id)}
                      <button className="rounded-lg bg-vinho-50 px-3 py-1.5 text-sm font-semibold text-vinho-700 hover:bg-vinho-100">
                        + Adicionar
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2 pb-6">
          {participo && (
            <form action={removerDoGrupo}>
              {ocultos(user.id)}
              <button className="botao-secundario text-sm">Sair do grupo</button>
            </form>
          )}
          {(souCriador || souAdmin) && (
            <form action={apagarGrupo}>
              <input type="hidden" name="grupo_id" value={grupoId} />
              <input type="hidden" name="turma_id" value={turmaId} />
              <BotaoConfirmar
                mensagem="Apagar o grupo? As provas e materiais SÓ deste grupo também serão apagados."
                className="w-full py-2 text-sm text-red-600 hover:underline"
              >
                Apagar grupo
              </BotaoConfirmar>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
