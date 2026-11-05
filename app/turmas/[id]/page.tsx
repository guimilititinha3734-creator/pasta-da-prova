// Página da turma: código de convite, grupos de estudo e lista de colegas
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Avatar } from "@/components/Avatar";
import { CodigoConvite } from "@/components/CodigoConvite";
import { FormularioSimples } from "@/components/FormularioSimples";
import { ListaProvas, type ProvaResumo } from "@/components/ListaProvas";
import { BarraEspaco } from "@/components/BarraEspaco";
import { criarGrupo, sairDaTurma, trocarCodigo } from "@/app/acoes";

export default async function PaginaTurma({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await exigirLogin();

  // Graças ao RLS, se a pessoa não for da turma, "turma" volta vazio.
  const { data: turma } = await supabase.from("turmas").select("*").eq("id", id).maybeSingle();
  if (!turma) notFound();

  const [{ data: membros }, { data: grupos }, { data: provas }] = await Promise.all([
    supabase
      .from("turma_membros")
      .select("papel, user_id, profiles ( nome, avatar_url )")
      .eq("turma_id", id)
      .order("entrou_em"),
    supabase
      .from("grupos")
      .select("id, nome, grupo_membros ( user_id )")
      .eq("turma_id", id)
      .order("created_at"),
    // O RLS já filtra: provas da turma toda + provas dos MEUS grupos
    supabase
      .from("provas")
      .select("id, nome, materia, professor, data, grupo_id, grupos ( nome ), materiais ( count )")
      .eq("turma_id", id),
  ]);

  const souAdmin = membros?.some((m) => m.user_id === user.id && m.papel === "admin");
  const qtdPessoas = membros?.length ?? 0;

  return (
    <>
      <Cabecalho
        titulo={turma.nome}
        subtitulo={`${qtdPessoas} ${qtdPessoas === 1 ? "pessoa" : "pessoas"}`}
        voltarPara="/"
      />

      <main className="space-y-8 px-4 py-6">
        <CodigoConvite codigo={turma.codigo_convite} nomeTurma={turma.nome} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Provas</h2>
            <Link
              href={`/turmas/${id}/provas/nova`}
              className="rounded-full bg-vinho-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-vinho-700"
            >
              ＋ Nova prova
            </Link>
          </div>
          {provas?.length ? (
            <ListaProvas provas={provas as unknown as ProvaResumo[]} mostrarGrupo />
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
              📝 Nenhuma prova ainda. Crie a primeira (ex.: &quot;P1 — Constitucional&quot;).
            </p>
          )}
        </section>

        <BarraEspaco turmaId={id} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Grupos de estudo</h2>
          {!grupos?.length && (
            <p className="text-sm text-stone-500">Nenhum grupo ainda. Crie um para estudar com parte da turma.</p>
          )}
          {grupos?.map((g) => {
            const qtd = g.grupo_membros.length;
            const participo = g.grupo_membros.some((m) => m.user_id === user.id);
            return (
              <Link
                key={g.id}
                href={`/turmas/${id}/grupos/${g.id}`}
                className="cartao flex items-center gap-3 active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl">👥</div>
                <div className="flex-1">
                  <p className="font-semibold text-stone-900">{g.nome}</p>
                  <p className="text-sm text-stone-500">
                    {qtd} {qtd === 1 ? "membro" : "membros"}
                    {participo && " · você participa"}
                  </p>
                </div>
                <span className="text-xl text-stone-400">›</span>
              </Link>
            );
          })}
          <FormularioSimples
            acao={criarGrupo}
            nomeCampo="nome"
            placeholder='Novo grupo (ex.: "Grupo da P1")'
            textoBotao="Criar"
            ocultos={{ turma_id: id }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Colegas</h2>
          <ul className="cartao divide-y divide-stone-100 p-0">
            {membros?.map((m) => {
              const p = m.profiles as unknown as { nome: string; avatar_url: string | null } | null;
              return (
                <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar nome={p?.nome ?? "?"} url={p?.avatar_url} />
                  <span className="flex-1 truncate">
                    {p?.nome}
                    {m.user_id === user.id && <span className="text-stone-400"> (você)</span>}
                  </span>
                  {m.papel === "admin" && (
                    <span className="rounded-full bg-vinho-50 px-2 py-0.5 text-xs font-medium text-vinho-700">admin</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-2 pb-6">
          {souAdmin && (
            <form action={trocarCodigo}>
              <input type="hidden" name="turma_id" value={id} />
              <button className="botao-secundario text-sm">Gerar novo código de convite</button>
            </form>
          )}
          <form action={sairDaTurma}>
            <input type="hidden" name="turma_id" value={id} />
            <button className="w-full py-2 text-sm text-red-600 hover:underline">Sair da turma</button>
          </form>
        </section>
      </main>
    </>
  );
}
