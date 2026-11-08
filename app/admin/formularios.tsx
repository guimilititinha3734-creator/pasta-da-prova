"use client";

// Formulários do painel admin: editar o espaço/plano de uma turma
// e a configuração geral do app.
import { useActionState, useState } from "react";
import { excluirTurma, removerPlano, salvarConfig, salvarContato, salvarCotaTurma } from "./acoes";
import { formatarPreco, MESES_POR_PLANO, PLANOS } from "@/lib/planos";
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
  const [nomePlano, setNomePlano] = useState(turma.plano ?? "");

  return (
    <div className="space-y-3">
      <form action={executar} className="space-y-3">
        <input type="hidden" name="turma_id" value={turma.id} />

        {/* Atalho: liberar um plano vendido com 1 clique (depois é só Salvar) */}
        <div className="space-y-1">
          <span className="text-sm font-medium text-stone-700">Liberar plano vendido</span>
          <div className="flex flex-wrap gap-1.5">
            {PLANOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setValor(String(p.bytes / GB));
                  setUnidade("GB");
                  setComPlano(true);
                  setNomePlano(p.nome);
                  setPlanoAte(daquiA(MESES_POR_PLANO));
                }}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
              >
                {p.nome} · {formatarPreco(p.preco)}
              </button>
            ))}
          </div>
          <span className="block text-xs text-stone-500">
            Preenche tudo com {MESES_POR_PLANO} meses a partir de hoje. Confira e toque em Salvar.
          </span>
        </div>

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
                value={nomePlano}
                onChange={(e) => setNomePlano(e.target.value)}
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

// Botão de excluir turma: pede para DIGITAR o código, para não apagar sem querer
export function ExcluirTurma({ turma }: { turma: TurmaAdmin }) {
  const [estado, executar, pendente] = useActionState(excluirTurma, undefined);

  if (estado?.ok) return <p className="text-sm font-medium text-emerald-700">✓ {estado.ok}</p>;

  return (
    <form
      action={executar}
      onSubmit={(e) => {
        const digitado = window.prompt(
          `Excluir "${turma.nome}" PARA SEMPRE?

` +
            `Vai apagar ${turma.provas} prova(s), ${turma.materiais} material(is), os arquivos e tirar ` +
            `${turma.membros} pessoa(s) da turma. Não dá para desfazer.

` +
            `Para confirmar, digite o código da turma: ${turma.codigo}`,
        );
        if ((digitado ?? "").trim().toUpperCase() !== turma.codigo) {
          e.preventDefault();
          if (digitado !== null) alert("Código diferente. Nada foi apagado.");
        }
      }}
    >
      <input type="hidden" name="turma_id" value={turma.id} />
      {estado?.erro && <p className="mb-2 text-sm text-red-700">{estado.erro}</p>}
      <button
        disabled={pendente}
        className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        {pendente ? "Excluindo…" : "🗑️ Excluir turma"}
      </button>
    </form>
  );
}

export function FormContato({ atual }: { atual: string | null }) {
  const [estado, executar, pendente] = useActionState(salvarContato, undefined);
  return (
    <form action={executar} className="space-y-2">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">WhatsApp que recebe os pedidos de plano</span>
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          defaultValue={atual ? `+${atual}` : ""}
          placeholder="(11) 91234-5678"
          className="campo"
        />
        <span className="block text-xs text-stone-500">
          Aparece para as turmas no botão &quot;Quero este plano&quot;. Deixe vazio para esconder o botão.
        </span>
      </label>
      {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
      <button className="botao" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar WhatsApp"}
      </button>
    </form>
  );
}
