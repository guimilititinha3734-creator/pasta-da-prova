// Barra do topo: botão "voltar" (opcional), título e ação à direita
import Link from "next/link";

export function Cabecalho({
  titulo,
  subtitulo,
  voltarPara,
  direita,
}: {
  titulo: string;
  subtitulo?: string;
  voltarPara?: string;
  direita?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-stone-200 bg-papel/90 px-4 py-3 backdrop-blur">
      {voltarPara && (
        <Link
          href={voltarPara}
          aria-label="Voltar"
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl text-stone-700 hover:bg-stone-100"
        >
          ‹
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-stone-900">{titulo}</h1>
        {subtitulo && <p className="truncate text-xs text-stone-500">{subtitulo}</p>}
      </div>
      {direita}
    </header>
  );
}
