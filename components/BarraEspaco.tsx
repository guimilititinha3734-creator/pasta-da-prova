// Mostra quanto do 1 GB grátis já foi usado (por TODAS as turmas do app)
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBytes, LIMITES } from "@/lib/midia";

export async function BarraEspaco() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("espaco_usado");
  const usado = Number(data ?? 0);
  const pct = Math.min(100, (usado / LIMITES.espacoTotal) * 100);
  const cor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="cartao space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-stone-800">☁️ Espaço de arquivos</span>
        <span className="text-stone-600">
          {formatarBytes(usado)} de 1 GB ({pct.toFixed(pct < 1 ? 1 : 0).replace(".", ",")}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <p className="text-xs text-stone-500">
        Compartilhado por todo o app (plano grátis). Fotos são comprimidas; para vídeos longos, prefira link do
        YouTube (não listado) ou Google Drive — não gasta espaço.
      </p>
    </div>
  );
}
