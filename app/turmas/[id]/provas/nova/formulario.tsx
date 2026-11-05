"use client";

import { useActionState } from "react";
import { criarProva } from "@/app/acoes";

export function FormularioProva({
  turmaId,
  grupos,
  grupoInicial,
}: {
  turmaId: string;
  grupos: { id: string; nome: string }[];
  grupoInicial?: string;
}) {
  const [estado, executar, pendente] = useActionState(criarProva, undefined);

  return (
    <form action={executar} className="space-y-4">
      <input type="hidden" name="turma_id" value={turmaId} />

      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Nome da prova</span>
        <input name="nome" required placeholder="Ex.: P1, Prova Final, Seminário" className="campo" />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Matéria</span>
        <input name="materia" required placeholder="Ex.: Direito Constitucional" className="campo" />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Professor(a)</span>
        <input name="professor" placeholder="Ex.: Profa. Helena" className="campo" />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Data da prova</span>
        <input name="data" type="date" required className="campo" />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Quem vê esta prova?</span>
        <select name="grupo_id" defaultValue={grupoInicial ?? ""} className="campo">
          <option value="">Turma toda</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              Só o grupo: {g.nome}
            </option>
          ))}
        </select>
        <span className="block text-xs text-stone-500">
          Provas de grupo só aparecem para quem é membro daquele grupo.
        </span>
      </label>

      {estado?.erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{estado.erro}</p>}

      <button className="botao" disabled={pendente}>
        {pendente ? "Criando…" : "Criar prova"}
      </button>
    </form>
  );
}
