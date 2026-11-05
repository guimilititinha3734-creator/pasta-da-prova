// Tela inicial: "Minhas turmas" + criar turma + entrar com código
import Link from "next/link";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Avatar } from "@/components/Avatar";
import { FormularioSimples } from "@/components/FormularioSimples";
import { Contagem } from "@/components/Contagem";
import { BotaoExemplo } from "@/components/BotaoExemplo";
import { dataCurta, hojeISO } from "@/lib/datas";
import { criarTurma, entrarTurma } from "./acoes";

export default async function Inicio() {
  const { supabase, user } = await exigirLogin();

  const [{ data: perfil }, { data: vinculos }, { data: proximas }] = await Promise.all([
    supabase.from("profiles").select("nome, avatar_url").eq("id", user.id).single(),
    supabase
      .from("turma_membros")
      .select("papel, turmas ( id, nome, codigo_convite, turma_membros ( count ) )")
      .eq("user_id", user.id)
      .order("entrou_em", { ascending: false }),
    // Próximas provas de TODAS as minhas turmas/grupos (o RLS filtra)
    supabase
      .from("provas")
      .select("id, nome, materia, data, turmas ( nome )")
      .gte("data", hojeISO())
      .order("data")
      .limit(5),
  ]);

  const nome = perfil?.nome || user.email || "Estudante";
  const primeiroNome = nome.split(" ")[0];

  return (
    <>
      <Cabecalho
        titulo="Pasta da Prova"
        direita={
          <Link href="/perfil" aria-label="Meu perfil" className="rounded-full ring-vinho-200 hover:ring-2">
            <Avatar nome={nome} url={perfil?.avatar_url} tamanho={34} />
          </Link>
        }
      />

      <main className="space-y-8 px-4 py-6">
        <section>
          <h2 className="text-2xl font-bold text-stone-900">Olá, {primeiroNome} 👋</h2>
          <p className="text-stone-600">Escolha uma turma para ver as provas e os materiais.</p>
          {nome.includes("@") || !perfil?.avatar_url ? (
            <Link href="/perfil" className="mt-1 inline-block text-sm text-vinho-600 underline">
              Editar meu nome
            </Link>
          ) : null}
        </section>

        {!!proximas?.length && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Próximas provas</h3>
            <ul className="cartao divide-y divide-stone-100 p-0">
              {proximas.map((p) => (
                <li key={p.id}>
                  <Link href={`/provas/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-stone-900">{p.nome}</p>
                      <p className="truncate text-xs text-stone-500">
                        {(p.turmas as unknown as { nome: string } | null)?.nome} · {dataCurta(p.data)}
                      </p>
                    </div>
                    <Contagem data={p.data} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Minhas turmas</h3>
          {!vinculos?.length && (
            <p className="cartao text-center text-stone-500">
              Você ainda não está em nenhuma turma. Crie uma ou entre com o código que um colega te mandou.
            </p>
          )}
          {vinculos?.map((v) => {
            const t = v.turmas as unknown as {
              id: string;
              nome: string;
              codigo_convite: string;
              turma_membros: { count: number }[];
            };
            const membros = t.turma_membros?.[0]?.count ?? 0;
            return (
              <Link key={t.id} href={`/turmas/${t.id}`} className="cartao flex items-center gap-3 active:scale-[0.99]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-vinho-50 text-2xl">
                  ⚖️
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-900">{t.nome}</p>
                  <p className="text-sm text-stone-500">
                    {membros} {membros === 1 ? "pessoa" : "pessoas"}
                    {v.papel === "admin" && " · você é admin"}
                  </p>
                </div>
                <span className="text-xl text-stone-400">›</span>
              </Link>
            );
          })}
        </section>

        <section className="cartao space-y-3">
          <h3 className="font-semibold text-stone-900">Entrar com código</h3>
          <FormularioSimples acao={entrarTurma} nomeCampo="codigo" placeholder="Ex.: DIR-7K2P" textoBotao="Entrar" maiusculas />
        </section>

        <section className="cartao space-y-3">
          <h3 className="font-semibold text-stone-900">Criar uma turma nova</h3>
          <FormularioSimples acao={criarTurma} nomeCampo="nome" placeholder="Ex.: Direito 3º sem. Noturno" textoBotao="Criar" />
        </section>

        <section className="pb-6">
          <BotaoExemplo />
        </section>
      </main>
    </>
  );
}
