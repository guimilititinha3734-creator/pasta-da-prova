"use client";

// Formulário de 1 campo + botão, que mostra a mensagem de erro da ação.
// Usado em: criar turma, entrar com código, criar grupo.
import { useActionState } from "react";
import type { EstadoForm } from "@/lib/tipos";

export function FormularioSimples({
  acao,
  nomeCampo,
  placeholder,
  textoBotao,
  ocultos,
  maiusculas,
}: {
  acao: (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;
  nomeCampo: string;
  placeholder: string;
  textoBotao: string;
  ocultos?: Record<string, string>;
  maiusculas?: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);

  return (
    <form action={executar} className="space-y-2">
      {ocultos &&
        Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="flex gap-2">
        <input
          name={nomeCampo}
          required
          placeholder={placeholder}
          className={`campo ${maiusculas ? "uppercase placeholder:normal-case" : ""}`}
          autoCapitalize={maiusculas ? "characters" : "sentences"}
        />
        <button className="botao w-auto shrink-0 px-5" disabled={pendente}>
          {pendente ? "…" : textoBotao}
        </button>
      </div>
      {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
    </form>
  );
}
