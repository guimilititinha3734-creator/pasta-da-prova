"use client";

// Galeria de fotos em TELA CHEIA. No celular: deslize para o lado.
// No computador: setas do teclado ou botões ‹ ›. Esc fecha.
// (Usa o "scroll-snap" do próprio navegador — leve e sem bibliotecas.)
import { useCallback, useEffect, useRef, useState } from "react";
import type { ItemEstudo } from "./modo-estudo";

export function Galeria({
  fotos,
  inicio,
  estudados,
  onAlternarEstudado,
  onFechar,
}: {
  fotos: ItemEstudo[];
  inicio: number;
  estudados: Set<string>;
  onAlternarEstudado: (id: string) => void;
  onFechar: () => void;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(inicio);

  const irPara = useCallback((i: number, suave = true) => {
    const el = trilho.current;
    if (!el) return;
    const alvo = Math.max(0, Math.min(i, el.children.length - 1));
    el.scrollTo({ left: alvo * el.clientWidth, behavior: suave ? "smooth" : "instant" });
  }, []);

  // Guarda a função de fechar numa "ref" para o efeito abaixo rodar UMA vez só
  // (senão, ao marcar "estudada", a galeria voltaria para a 1ª foto)
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  // Abre já na foto clicada, trava a rolagem da página e ativa o teclado
  useEffect(() => {
    irPara(inicio, false);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") fechar.current();
      if (e.key === "ArrowRight") irPara(indiceAtual() + 1);
      if (e.key === "ArrowLeft") irPara(indiceAtual() - 1);
    }
    function indiceAtual() {
      const el = trilho.current;
      return el ? Math.round(el.scrollLeft / el.clientWidth) : 0;
    }
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflowAntes;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aoRolar() {
    const el = trilho.current;
    if (el) setAtual(Math.round(el.scrollLeft / el.clientWidth));
  }

  const foto = fotos[atual] ?? fotos[0]!;
  const feito = estudados.has(foto.id);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Galeria de fotos">
      {/* Topo */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium tabular-nums">
          {atual + 1} / {fotos.length}
        </span>
        <button
          onClick={onFechar}
          aria-label="Fechar galeria"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20"
        >
          ×
        </button>
      </div>

      {/* Trilho de fotos (deslizável) */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={trilho}
          onScroll={aoRolar}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {fotos.map((f) => (
            <div key={f.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.titulo} className="max-h-full max-w-full select-none object-contain" draggable={false} />
            </div>
          ))}
        </div>

        {atual > 0 && (
          <button
            onClick={() => irPara(atual - 1)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25 sm:flex"
          >
            ‹
          </button>
        )}
        {atual < fotos.length - 1 && (
          <button
            onClick={() => irPara(atual + 1)}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25 sm:flex"
          >
            ›
          </button>
        )}
      </div>

      {/* Legenda + "já estudei" */}
      <div className="space-y-3 px-4 pb-6 pt-3 text-white">
        <div>
          <p className="font-semibold">
            {foto.titulo}
            {foto.importantes > 0 && <span className="ml-2 text-amber-300">⭐ {foto.importantes}</span>}
          </p>
          <p className="text-sm text-white/60">
            {foto.aula_numero !== null && `Aula ${foto.aula_numero}`}
            {foto.tema && ` · ${foto.tema}`}
            {foto.autor && ` · por ${foto.autor}`}
          </p>
        </div>
        <button
          onClick={() => onAlternarEstudado(foto.id)}
          className={`w-full rounded-xl py-3 font-semibold transition active:scale-[0.98] ${
            feito ? "bg-emerald-600 text-white" : "bg-white/10 text-white ring-1 ring-white/30"
          }`}
        >
          {feito ? "✓ Já estudei esta foto" : "Marcar como estudada"}
        </button>
        {fotos.length > 1 && <p className="text-center text-xs text-white/40 sm:hidden">Deslize para o lado ←→</p>}
      </div>
    </div>
  );
}
