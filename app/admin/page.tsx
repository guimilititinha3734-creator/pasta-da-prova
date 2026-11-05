// PAINEL DE ADMINISTRAÇÃO — só para administradores do app.
// Mostra números gerais, o espaço de cada turma e permite liberar planos.
import { notFound } from "next/navigation";
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { formatarBytes } from "@/lib/midia";
import { dataCurta, diasAte } from "@/lib/datas";
import { EditorTurma, ExcluirTurma, FormConfig } from "./formularios";

export const metadata = { title: "Admin · Pasta da Prova" };

export type TurmaAdmin = {
  id: string;
  nome: string;
  codigo: string;
  criada_em: string;
  cota: number;
  cota_efetiva: number;
  cota_gratis: number | null;
  plano: string | null;
  plano_ate: string | null;
  usado: number;
  membros: number;
  provas: number;
  materiais?: number;
  criador: string | null;
  ultima_atividade?: string;
};

// Dias desde a última atividade da turma
function diasParado(iso?: string) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
// "Abandonada": ninguém na turma, ou nada acontece há 30+ dias
function abandonada(t: TurmaAdmin) {
  return t.membros === 0 || diasParado(t.ultima_atividade) >= 30;
}

type Painel = {
  config: { capacidade: number; cota_padrao: number };
  resumo: {
    usuarios: number;
    turmas: number;
    provas: number;
    materiais: number;
    comentarios: number;
    usado_total: number;
    alocado: number;
  };
  turmas: TurmaAdmin[];
};

export default async function PaginaAdmin() {
  const { supabase } = await exigirLogin();

  // O banco recusa quem não é admin — para os outros, a página "não existe"
  const { data, error } = await supabase.rpc("admin_painel");
  if (error || !data) notFound();
  const { config, resumo, turmas } = data as Painel;

  const pctAlocado = Math.min(100, (resumo.alocado / config.capacidade) * 100);
  const pctUsado = Math.min(100, (resumo.usado_total / config.capacidade) * 100);
  const qtdAbandonadas = turmas.filter(abandonada).length;
  const vagasGratis = Math.max(
    0,
    Math.floor((config.capacidade - resumo.alocado) / Math.max(1, config.cota_padrao)),
  );

  return (
    <>
      <Cabecalho titulo="⚙️ Administração" subtitulo="Só você vê esta página" voltarPara="/" />

      <main className="space-y-6 px-4 py-6 pb-16">
        {/* NÚMEROS GERAIS */}
        <section className="grid grid-cols-3 gap-2">
          {[
            ["👤", "Usuários", resumo.usuarios],
            ["⚖️", "Turmas", resumo.turmas],
            ["📝", "Provas", resumo.provas],
            ["📎", "Materiais", resumo.materiais],
            ["💬", "Comentários", resumo.comentarios],
            ["🎟️", "Vagas grátis", vagasGratis],
          ].map(([icone, rotulo, valor]) => (
            <div key={String(rotulo)} className="cartao p-3 text-center">
              <p className="text-xl">{icone}</p>
              <p className="text-xl font-bold text-stone-900">{valor}</p>
              <p className="text-xs text-stone-500">{rotulo}</p>
            </div>
          ))}
        </section>

        {/* CAPACIDADE DO APP */}
        <section className="cartao space-y-3">
          <h2 className="font-bold text-stone-900">☁️ Capacidade do app</h2>
          <Medidor
            rotulo="Distribuído entre as turmas"
            valor={`${formatarBytes(resumo.alocado)} de ${formatarBytes(config.capacidade)}`}
            pct={pctAlocado}
          />
          <Medidor
            rotulo="Realmente usado (arquivos)"
            valor={`${formatarBytes(resumo.usado_total)} de ${formatarBytes(config.capacidade)}`}
            pct={pctUsado}
          />
          <p className="text-xs text-stone-500">
            Turmas novas ganham {formatarBytes(config.cota_padrao)} enquanto houver capacidade sobrando
            ({vagasGratis} {vagasGratis === 1 ? "vaga" : "vagas"}). Depois disso, nascem com 0 até você liberar.
          </p>
          <details className="rounded-xl bg-stone-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-stone-700">Alterar configuração</summary>
            <div className="mt-3">
              <FormConfig capacidadeGb={config.capacidade / 1024 ** 3} cotaPadraoMb={config.cota_padrao / 1024 ** 2} />
            </div>
          </details>
        </section>

        {/* TURMAS */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Turmas ({turmas.length})
          </h2>
          {qtdAbandonadas > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              🕸️ {qtdAbandonadas} {qtdAbandonadas === 1 ? "turma parece abandonada" : "turmas parecem abandonadas"}{" "}
              (sem ninguém ou sem atividade há 30+ dias). Elas aparecem primeiro, com o selo 🕸️. Excluir libera o
              espaço delas para turmas novas.
            </p>
          )}

          {[...turmas].sort((a, b) => Number(abandonada(b)) - Number(abandonada(a))).map((t) => {
            const pct = t.cota_efetiva ? Math.min(100, (t.usado / t.cota_efetiva) * 100) : 100;
            const vencido = !!t.plano_ate && diasAte(t.plano_ate) < 0;
            const venceLogo = !!t.plano_ate && !vencido && diasAte(t.plano_ate) <= 15;
            return (
              <article key={t.id} className="cartao space-y-3">
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-900">{t.nome}</p>
                    <p className="text-xs text-stone-500">
                      <span className="font-mono">{t.codigo}</span> · {t.membros}{" "}
                      {t.membros === 1 ? "pessoa" : "pessoas"} · {t.provas} {t.provas === 1 ? "prova" : "provas"}
                      {t.criador && ` · criada por ${t.criador}`}
                    </p>
                    <p className={`text-xs ${abandonada(t) ? "font-semibold text-amber-700" : "text-stone-400"}`}>
                      {abandonada(t) && "🕸️ "}
                      {t.membros === 0
                        ? "Sem nenhum membro"
                        : diasParado(t.ultima_atividade) === 0
                          ? "Ativa hoje"
                          : `Última atividade há ${diasParado(t.ultima_atividade)} dia(s)`}
                      {typeof t.materiais === "number" && ` · ${t.materiais} materiais`}
                    </p>
                  </div>
                  {t.plano ? (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        vencido
                          ? "bg-red-100 text-red-800"
                          : venceLogo
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {t.plano} · {vencido ? "venceu" : "até"} {dataCurta(t.plano_ate!)}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                      {t.cota ? "grátis" : "sem espaço"}
                    </span>
                  )}
                </header>

                <Medidor
                  rotulo="Espaço"
                  valor={
                    t.cota_efetiva
                      ? `${formatarBytes(t.usado)} de ${formatarBytes(t.cota_efetiva)}`
                      : `${formatarBytes(t.usado)} · cota 0`
                  }
                  pct={pct}
                />
                {vencido && (
                  <p className="text-xs text-red-700">
                    O plano venceu: a turma já voltou para {formatarBytes(t.cota_efetiva)}. Renove ou encerre o plano.
                  </p>
                )}

                <details className="rounded-xl bg-stone-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-vinho-700">✏️ Alterar espaço / plano</summary>
                  <div className="mt-3">
                    <EditorTurma turma={t} />
                  </div>
                </details>

                <ExcluirTurma turma={t} />
              </article>
            );
          })}
        </section>

        <p className="text-center text-xs text-stone-400">
          Para dar acesso de admin a outra pessoa, veja o fim do arquivo supabase/04_painel_admin.sql.
        </p>
      </main>
    </>
  );
}

function Medidor({ rotulo, valor, pct }: { rotulo: string; valor: string; pct: number }) {
  const cor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-stone-600">{rotulo}</span>
        <span className="text-right font-medium text-stone-800">{valor}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  );
}
