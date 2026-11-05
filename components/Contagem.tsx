// Etiqueta colorida "faltam 12 dias" / "é amanhã!" / "foi há 5 dias"
import { contagem } from "@/lib/datas";

const CORES = {
  urgente: "bg-red-100 text-red-800",
  breve: "bg-amber-100 text-amber-800",
  longe: "bg-emerald-100 text-emerald-800",
  passou: "bg-stone-200 text-stone-600",
};

export function Contagem({ data, grande }: { data: string; grande?: boolean }) {
  const { texto, tom } = contagem(data);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${CORES[tom]} ${
        grande ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      ⏳ {texto}
    </span>
  );
}
