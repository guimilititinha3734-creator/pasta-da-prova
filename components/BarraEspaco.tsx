// Mostra quanto do espaço DA TURMA já foi usado.
// Cada turma tem a sua cota ("armário"), separada das outras turmas.
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBytes } from "@/lib/midia";

export async function BarraEspaco({ turmaId }: { turmaId: string }) {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("espaco_da_turma", { p_turma: turmaId });
  if (error) return null; // ex.: SQL da etapa 5 ainda não rodado

  const { usado, cota } = data as { usado: number; cota: number };

  if (!cota) {
    return (
      <div className="cartao space-y-1 border-amber-200 bg-amber-50">
        <p className="text-sm font-semibold text-amber-900">☁️ Esta turma ainda não tem espaço para arquivos</p>
        <p className="text-xs text-amber-800">
          O espaço grátis do app já foi distribuído entre outras turmas. Vocês podem postar normalmente
          anotações e links de vídeo (YouTube/Drive). Para liberar fotos, vídeos e PDFs, fale com o responsável
          pelo app.
        </p>
      </div>
    );
  }

  const pct = Math.min(100, (Number(usado) / Number(cota)) * 100);
  const cor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="cartao space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-stone-800">☁️ Espaço da turma</span>
        <span className="text-stone-600">
          {formatarBytes(Number(usado))} de {formatarBytes(Number(cota))} (
          {pct.toFixed(pct < 1 ? 1 : 0).replace(".", ",")}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <p className="text-xs text-stone-500">
        {pct >= 100
          ? "Espaço cheio: apaguem materiais antigos para postar novos arquivos. Anotações e links continuam liberados."
          : "Só desta turma (inclui as provas dos grupos). Fotos são comprimidas; para vídeos, prefiram link do YouTube ou Drive — não gasta espaço."}
      </p>
    </div>
  );
}
