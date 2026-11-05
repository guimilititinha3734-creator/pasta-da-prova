// Lista de provas (próximas primeiro, depois as que já passaram)
import Link from "next/link";
import { Contagem } from "./Contagem";
import { dataCurta, diasAte } from "@/lib/datas";

export type ProvaResumo = {
  id: string;
  nome: string;
  materia: string;
  professor: string;
  data: string;
  grupo_id: string | null;
  grupos?: { nome: string } | null;
  materiais?: { count: number }[];
};

export function ListaProvas({ provas, mostrarGrupo }: { provas: ProvaResumo[]; mostrarGrupo?: boolean }) {
  const proximas = provas.filter((p) => diasAte(p.data) >= 0).sort((a, b) => a.data.localeCompare(b.data));
  const passadas = provas.filter((p) => diasAte(p.data) < 0).sort((a, b) => b.data.localeCompare(a.data));

  const cartao = (p: ProvaResumo) => {
    const qtd = p.materiais?.[0]?.count ?? 0;
    return (
      <Link key={p.id} href={`/provas/${p.id}`} className="cartao block active:scale-[0.99]">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-stone-900">{p.nome}</p>
          <Contagem data={p.data} />
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {p.materia}
          {p.professor && ` · ${p.professor}`}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-stone-500">
          <span>📅 {dataCurta(p.data)}</span>
          <span>📎 {qtd} {qtd === 1 ? "material" : "materiais"}</span>
          {mostrarGrupo && p.grupo_id && <span>👥 {p.grupos?.nome ?? "grupo"}</span>}
        </p>
      </Link>
    );
  };

  return (
    <div className="space-y-3">
      {proximas.map(cartao)}
      {passadas.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-1 text-sm font-medium text-stone-500">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> Provas que já passaram ({passadas.length})
          </summary>
          <div className="mt-2 space-y-3 opacity-80">{passadas.map(cartao)}</div>
        </details>
      )}
    </div>
  );
}
