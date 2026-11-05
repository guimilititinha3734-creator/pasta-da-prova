// Botão ⭐ "Importante" (mostra quantas pessoas marcaram)
import { alternarImportante } from "@/app/acoes";

export function BotaoImportante({
  materialId,
  total,
  marcado,
  caminho,
}: {
  materialId: string;
  total: number;
  marcado: boolean;
  caminho: string; // página a atualizar depois do clique
}) {
  return (
    <form action={alternarImportante}>
      <input type="hidden" name="material_id" value={materialId} />
      <input type="hidden" name="marcado" value={marcado ? "1" : "0"} />
      <input type="hidden" name="caminho" value={caminho} />
      <button
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
          marcado ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
        }`}
        title={marcado ? "Desmarcar como importante" : "Marcar como importante"}
      >
        {marcado ? "⭐" : "☆"} Importante{total > 0 && ` · ${total}`}
      </button>
    </form>
  );
}
