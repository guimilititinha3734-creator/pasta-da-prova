"use client";

import { useActionState, useEffect, useRef } from "react";
import { comentar } from "@/app/acoes";

export function FormularioComentario({ materialId }: { materialId: string }) {
  const [estado, executar, pendente] = useActionState(comentar, undefined);
  const form = useRef<HTMLFormElement>(null);

  // limpa a caixa depois de enviar
  useEffect(() => {
    if (estado?.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} action={executar} className="space-y-2">
      <input type="hidden" name="material_id" value={materialId} />
      <textarea
        name="texto"
        rows={2}
        required
        maxLength={2000}
        placeholder="Escreva uma dúvida ou comentário…"
        className="campo"
      />
      {estado?.erro && <p className="text-sm text-red-700">{estado.erro}</p>}
      <button className="botao" disabled={pendente}>
        {pendente ? "Enviando…" : "Comentar"}
      </button>
    </form>
  );
}
