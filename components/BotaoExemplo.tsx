"use client";

// "Carregar dados de exemplo": cria uma turma de teste completa.
// O banco cria turma, grupo, provas e anotações; aqui o navegador
// DESENHA 3 "fotos de quadro" e envia, para testar a galeria.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

const QUADROS = [
  {
    aula: 1,
    tema: "Teoria da Constituição",
    titulo: "Quadro — classificação da CF/88",
    linhas: ["CLASSIFICAÇÃO DA CF/88", "", "• Escrita", "• Promulgada (democrática)", "• Rígida (art. 60)", "• Analítica", "• Dogmática", "", "→ CAI NA PROVA!"],
  },
  {
    aula: 2,
    tema: "Poder Constituinte",
    titulo: "Quadro — poder constituinte",
    linhas: ["PODER CONSTITUINTE", "", "ORIGINÁRIO", "  inicial · ilimitado · incondicionado", "", "DERIVADO", "  reformador → emendas (art. 60)", "  decorrente → constituições estaduais", "  revisor → art. 3º ADCT"],
  },
  {
    aula: 3,
    tema: "Controle de constitucionalidade",
    titulo: "Quadro — controle difuso × concentrado",
    linhas: ["CONTROLE DE CONSTITUCIONALIDADE", "", "DIFUSO         |  CONCENTRADO", "qualquer juiz   |  STF", "caso concreto  |  abstrato", "inter partes    |  erga omnes", "", "ADI · ADC · ADPF · ADO", "Reserva de plenário: art. 97"],
  },
];

function desenharQuadro(linhas: string[]): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const g = c.getContext("2d")!;
  // moldura de madeira + lousa verde
  g.fillStyle = "#7a5230";
  g.fillRect(0, 0, 1200, 800);
  const grad = g.createLinearGradient(0, 0, 1200, 800);
  grad.addColorStop(0, "#2f4f3a");
  grad.addColorStop(1, "#203a2a");
  g.fillStyle = grad;
  g.fillRect(30, 30, 1140, 740);
  // "giz"
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.font = "bold 44px 'Comic Sans MS', 'Segoe Print', cursive";
  g.fillText(linhas[0]!, 80, 120);
  g.fillRect(80, 135, Math.min(g.measureText(linhas[0]!).width, 1000), 4);
  g.font = "36px 'Comic Sans MS', 'Segoe Print', cursive";
  linhas.slice(1).forEach((l, i) => g.fillText(l, 80, 200 + i * 58));
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.8));
}

export function BotaoExemplo() {
  const router = useRouter();
  const [estado, setEstado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setErro(null);
    setEstado("Criando turma de exemplo…");
    const supabase = criarClienteNavegador();
    try {
      const { data, error } = await supabase.rpc("carregar_exemplo");
      if (error) throw error;
      const { turma_id, prova_id } = data as { turma_id: string; prova_id: string };

      const {
        data: { user },
      } = await supabase.auth.getUser();

      for (const [i, q] of QUADROS.entries()) {
        setEstado(`Desenhando e enviando foto ${i + 1} de ${QUADROS.length}…`);
        const blob = await desenharQuadro(q.linhas);
        const caminho = `${prova_id}/exemplo-${Date.now()}-${i}.jpg`;
        const up = await supabase.storage.from("materiais").upload(caminho, blob, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const ins = await supabase.from("materiais").insert({
          prova_id,
          autor_id: user!.id,
          tipo: "foto",
          titulo: q.titulo,
          aula_numero: q.aula,
          tema: q.tema,
          arquivo_path: caminho,
          tamanho_bytes: blob.size,
        });
        if (ins.error) throw ins.error;
      }

      router.push(`/turmas/${turma_id}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar exemplo.");
      setEstado(null);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={carregar} disabled={!!estado} className="botao-secundario text-sm">
        {estado ?? "🧪 Carregar dados de exemplo"}
      </button>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <p className="text-center text-xs text-stone-500">
        Cria uma turma de teste com grupo, 3 provas, anotações, fotos e links — só para você.
      </p>
    </div>
  );
}
