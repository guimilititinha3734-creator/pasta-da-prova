"use client";

import { useActionState } from "react";
import { atualizarNome } from "@/app/acoes";

export function FormularioNome({ nomeAtual }: { nomeAtual: string }) {
  const [estado, executar, pendente] = useActionState(atualizarNome, undefined);

  return (
    <form action={executar} className="cartao space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Seu nome (aparece para os colegas)</span>
        <input name="nome" defaultValue={nomeAtual} required maxLength={60} className="campo" />
      </label>
      {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
      <button className="botao" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar nome"}
      </button>
    </form>
  );
}
