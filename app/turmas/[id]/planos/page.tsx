// Página "Planos" da turma: mostra o espaço atual e as opções pagas.
// O pedido vai pelo WhatsApp do responsável; ele libera pelo /admin.
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { BarraEspaco } from "@/components/BarraEspaco";
import { formatarBytes } from "@/lib/midia";
import { dataCurta, diasAte } from "@/lib/datas";
import { formatarPreco, linkPedido, MESES_POR_PLANO, PLANOS } from "@/lib/planos";

export const metadata = { title: "Planos · Pasta da Prova" };

export default async function PaginaPlanos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirLogin();

  const { data: turma } = await supabase
    .from("turmas")
    .select("id, nome, codigo_convite, cota_bytes, plano_nome, plano_ate, turma_membros ( count )")
    .eq("id", id)
    .maybeSingle();
  if (!turma) notFound();

  const { data: whatsapp } = await supabase.rpc("contato_vendas");
  const membros = (turma.turma_membros as unknown as { count: number }[])?.[0]?.count ?? 1;
  const planoAtivo = turma.plano_nome && turma.plano_ate && diasAte(turma.plano_ate) >= 0;

  return (
    <>
      <Cabecalho titulo="Planos da turma" subtitulo={turma.nome} voltarPara={`/turmas/${id}`} />

      <main className="space-y-6 px-4 py-6 pb-16">
        <section className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-stone-900">Mais espaço para a turma 📚</h2>
          <p className="text-stone-600">
            O plano vale para <b>todo mundo da turma</b> (e os grupos dela) por {MESES_POR_PLANO} meses. O espaço é
            só de vocês — não é dividido com outras turmas.
          </p>
        </section>

        <BarraEspaco turmaId={id} semLinkPlanos />

        {planoAtivo && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            ✅ Esta turma tem o plano <b>{turma.plano_nome}</b> até {dataCurta(turma.plano_ate!)}. Para renovar ou
            trocar, escolha um plano abaixo.
          </p>
        )}

        {/* Plano grátis (atual) */}
        <article className="cartao flex items-center justify-between gap-3 opacity-80">
          <div>
            <p className="font-semibold text-stone-900">Grátis</p>
            <p className="text-sm text-stone-500">
              {turma.cota_bytes && !planoAtivo ? formatarBytes(turma.cota_bytes) : "200 MB"} · anotações e links
              ilimitados
            </p>
          </div>
          {!planoAtivo && (
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">atual</span>
          )}
        </article>

        {/* Planos pagos */}
        {PLANOS.map((p) => {
          const porAluno = p.preco / Math.max(1, membros);
          const atual = planoAtivo && turma.plano_nome === p.nome;
          return (
            <article
              key={p.id}
              className={`cartao relative space-y-3 ${p.destaque ? "border-2 border-vinho-500 shadow-md" : ""}`}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-4 rounded-full bg-vinho-600 px-3 py-0.5 text-xs font-bold text-white">
                  ⭐ {p.destaque}
                </span>
              )}
              <div className="flex items-start justify-between gap-2 pt-1">
                <div>
                  <p className="text-lg font-bold text-stone-900">{p.nome}</p>
                  <p className="text-sm text-stone-600">{p.descricao}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-vinho-700">{formatarPreco(p.preco)}</p>
                  <p className="text-xs text-stone-500">por semestre</p>
                </div>
              </div>

              <ul className="space-y-1 text-sm text-stone-700">
                <li>☁️ {formatarBytes(p.bytes)} só da turma</li>
                <li>📷 Fotos, 📄 PDFs e 🎬 vídeos (até 25 MB cada)</li>
                <li>👥 Vale para todos os membros e grupos da turma</li>
                <li>
                  💸 Dividindo entre {membros} {membros === 1 ? "pessoa" : "pessoas"}:{" "}
                  <b>{(Math.ceil(porAluno * 100) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b> cada
                </li>
              </ul>

              {atual ? (
                <p className="rounded-xl bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-800">
                  Plano atual da turma
                </p>
              ) : whatsapp ? (
                <a
                  href={linkPedido(whatsapp, p, { nome: turma.nome, codigo: turma.codigo_convite })}
                  target="_blank"
                  rel="noreferrer"
                  className={p.destaque ? "botao" : "botao-secundario"}
                >
                  💬 Quero este plano
                </a>
              ) : (
                <p className="rounded-xl bg-stone-100 py-3 text-center text-sm text-stone-500">
                  Contratação disponível em breve
                </p>
              )}
            </article>
          );
        })}

        <section className="cartao space-y-2 text-sm text-stone-600">
          <p className="font-semibold text-stone-800">Como funciona</p>
          <p>1. Toque em &quot;Quero este plano&quot; — abre o WhatsApp com o pedido pronto.</p>
          <p>2. Você recebe os dados para pagar por Pix.</p>
          <p>3. Assim que o pagamento é confirmado, o espaço da turma aumenta.</p>
          <p>
            Quando o semestre acaba, a turma volta para o plano grátis — <b>nada é apagado</b>, só não dá para enviar
            arquivos novos acima do limite grátis.
          </p>
        </section>
      </main>
    </>
  );
}
