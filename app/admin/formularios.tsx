"use client";

// Formulários do painel admin: editar o espaço/plano de uma turma
// e a configuração geral do app.
import { useActionState, useState } from "react";
import { removerPlano, salvarConfig, salvarCotaTurma } from "./acoes";
import type { TurmaAdmin } from "./page";

const MB = 1024 * 1024;
const GB = 1024 * MB;

// Atalhos rápidos de tamanho
const ATALHOS: { rotulo: string; valor: number; unidade: "MB" | "GB" }[] = [
  { rotulo: "0", valor: 0, unidade: "MB" },
  { rotulo: "200 MB", valor: 200, unidade: "MB" },
  { rotulo: "1 GB", valor: 1, unidade: "GB" },
  { rotulo: "5 GB", valor: 5, unidade: "GB" },
  { rotulo: "10 GB", valor: 10, unidade: "GB" },
];

function separar(bytes: number): { valor: string; unidade: "MB" | "GB" } {
  if (bytes >= GB && bytes % (GB / 10) === 0) return { valor: String(+(bytes / GB).toFixed(1)), unidade: "GB" };
  return { valor: String(Math.round(bytes / MB)), unidade: "MB" };
}

// Data daqui a N meses, no formato AAAA-MM-DD
function daquiA(meses: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

export function EditorTurma({ turma }: { turma: TurmaAdmin }) {
  const [estado, executar, pendente] = useActionState(salvarCotaTurma, undefined);
  const inicial = separar(turma.cota);
  const [valor, setValor] = useState(inicial.valor);
  const [unidade, setUnidade] = useState<"MB" | "GB">(inicial.unidade);
  const [comPlano, setComPlano] = useState(!!turma.plano);
  const [planoAte, setPlanoAte] = useState(turma.plano_ate ?? daquiA(6));

  return (
    <div className="space-y-3">
      <form action={executar} className="space-y-3">
        <input type="hidden" name="turma_id" value={turma.id} />

        <div className="space-y-1">
          <span className="text-sm font-medium text-stone-700">Espaço da turma</span>
          <div className="flex flex-wrap gap-1.5">
            {ATALHOS.map((a) => (
              <button
                key={a.rotulo}
                type="button"
                onClick={() => {
                  setValor(String(a.valor));
                  setUnidade(a.unidade);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  valor === String(a.valor) && unidade === a.unidade
                    ? "bg-vinho-600 text-white ring-vinho-600"
                    : "bg-white text-stone-700 ring-stone-300"
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              name="cota"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              className="campo"
              aria-label="Tamanho"
            />
            <select
              name="unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as "MB" | "GB")}
              className="campo w-24"
            >
              <option>MB</option>
              <option>GB</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            name="com_plano"
            checked={comPlano}
            onChange={(e) => setComPlano(e.target.checked)}
            className="h-5 w-5 accent-vinho-600"
          />
          É um plano pago (com data de vencimento)
        </label>

        {comPlano && (
          <div className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-stone-200">
            <label className="block space-y-1">
              <span className="text-sm text-stone-700">Nome do plano</span>
              <input
                name="plano_nome"
                defaultValue={turma.plano ?? `Pro ${valor} ${unidade}`}
                placeholder="Ex.: Pro 10 GB"
                className="campo"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-stone-700">Vale até</span>
              <input
                name="plano_ate"
                type="date"
                value={planoAte}
                onChange={(e) => setPlanoAte(e.target.value)}
                className="campo"
              />
            </label>
            <div className="flex gap-1.5">
              {[
                ["+1 mês", 1],
                ["+6 meses", 6],
                ["+1 ano", 12],
              ].map(([r, m]) => (
                <button
                  key={String(r)}
                  type="button"
                  onClick={() => setPlanoAte(daquiA(Number(m)))}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500">
              Quando vencer, a turma volta sozinha para a cota grátis que tinha antes
              {turma.plano ? ` (${Math.round((turma.cota_gratis ?? 0) / MB)} MB)` : ""}.
            </p>
          </div>
        )}

        {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
        {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}

        <button className="botao" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </button>
      </form>

      {turma.plano && (
        <form action={removerPlano}>
          <input type="hidden" name="turma_id" value={turma.id} />
          <button
            className="w-full py-2 text-sm text-red-600 hover:underline"
            onClick={(e) => {
              if (!confirm("Encerrar o plano agora? A turma volta para a cota grátis.")) e.preventDefault();
            }}
          >
            Encerrar plano agora
          </button>
        </form>
      )}
    </div>
  );
}

export function FormConfig({ capacidadeGb, cotaPadraoMb }: { capacidadeGb: number; cotaPadraoMb: number }) {
  const [estado, executar, pendente] = useActionState(salvarConfig, undefined);
  return (
    <form action={executar} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Capacidade total do app (GB)</span>
        <input name="capacidade_gb" defaultValue={+capacidadeGb.toFixed(2)} inputMode="decimal" className="campo" />
        <span className="block text-xs text-stone-500">
          Plano grátis do Supabase: 1. Supabase Pro: 100. Coloque o que você realmente tem.
        </span>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Espaço de cada turma nova (MB)</span>
        <input name="cota_padrao_mb" defaultValue={Math.round(cotaPadraoMb)} inputMode="numeric" className="campo" />
        <span className="block text-xs text-stone-500">Vale só para turmas criadas depois. Ex.: 200 ou 1024 (1 GB).</span>
      </label>
      {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
      <button className="botao" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar configuração"}
      </button>
    </form>
  );
}
