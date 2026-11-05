"use client";

// Mostra o código da turma com botões de copiar e compartilhar (WhatsApp etc.)
import { useState } from "react";

export function CodigoConvite({ codigo, nomeTurma }: { codigo: string; nomeTurma: string }) {
  const [copiado, setCopiado] = useState(false);

  const texto = `Entra na turma "${nomeTurma}" no Pasta da Prova! Código: ${codigo}`;

  async function compartilhar() {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pasta da Prova", text: texto, url });
        return;
      } catch {
        /* a pessoa cancelou */
      }
    }
    await copiar(`${texto}\n${url}`);
  }

  async function copiar(valor = codigo) {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="rounded-2xl bg-vinho-600 p-4 text-white shadow-md">
      <p className="text-xs font-medium uppercase tracking-wider text-vinho-100">Código de convite</p>
      <p className="my-1 font-mono text-3xl font-bold tracking-widest">{codigo}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => copiar()}
          className="flex-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <button
          onClick={compartilhar}
          className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-vinho-700 hover:bg-vinho-50"
        >
          Convidar amigos
        </button>
      </div>
    </div>
  );
}
