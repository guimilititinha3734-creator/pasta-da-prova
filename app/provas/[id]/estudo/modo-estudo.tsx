"use client";

// Tela interativa do modo estudo: filtros, checklist "já estudei",
// progresso e galeria de fotos em tela cheia.
import { useMemo, useState } from "react";
import Link from "next/link";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { ConteudoMaterial } from "@/components/ConteudoMaterial";
import { INFO_TIPO, type TipoMaterial } from "@/lib/midia";
import { Galeria } from "./galeria";

export type ItemEstudo = {
  id: string;
  tipo: TipoMaterial;
  titulo: string;
  texto: string;
  link_url: string | null;
  aula_numero: number | null;
  tema: string;
  autor: string;
  url?: string;
  importantes: number;
  comentarios: number;
};

type Filtro = "todos" | "foto" | "video" | "pdf" | "nota";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Tudo" },
  { id: "foto", rotulo: "📷 Fotos" },
  { id: "video", rotulo: "🎬 Vídeos" },
  { id: "pdf", rotulo: "📄 PDFs" },
  { id: "nota", rotulo: "📝 Anotações" },
];

function passaFiltro(item: ItemEstudo, f: Filtro) {
  if (f === "todos") return true;
  if (f === "video") return item.tipo === "video" || item.tipo === "video_link";
  return item.tipo === f;
}

export function ModoEstudo({
  provaId,
  userId,
  itens,
  estudadosIniciais,
}: {
  provaId: string;
  userId: string;
  itens: ItemEstudo[];
  estudadosIniciais: string[];
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [soImportantes, setSoImportantes] = useState(false);
  const [ocultarEstudados, setOcultarEstudados] = useState(false);
  const [estudados, setEstudados] = useState(() => new Set(estudadosIniciais));
  // Galeria aberta: guarda a lista de fotos do momento em que abriu
  // (assim marcar "estudada" não faz a foto sumir da galeria)
  const [galeria, setGaleriaEstado] = useState<{ fotos: ItemEstudo[]; inicio: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Progresso considera TODO o material da prova (não só o filtrado)
  const feitos = itens.filter((i) => estudados.has(i.id)).length;
  const pct = itens.length ? Math.round((feitos / itens.length) * 100) : 0;

  const visiveis = useMemo(
    () =>
      itens.filter(
        (i) =>
          passaFiltro(i, filtro) &&
          (!soImportantes || i.importantes > 0) &&
          (!ocultarEstudados || !estudados.has(i.id)),
      ),
    [itens, filtro, soImportantes, ocultarEstudados, estudados],
  );

  // Fotos visíveis, na ordem — é o que a galeria percorre
  const fotos = visiveis.filter((i) => i.tipo === "foto" && i.url);
  const setGaleria = (inicio: number | null) =>
    setGaleriaEstado(inicio === null ? null : { fotos, inicio: Math.max(0, inicio) });

  // Agrupa por aula mantendo a ordem
  const aulas: { chave: string; titulo: string; itens: ItemEstudo[] }[] = [];
  for (const i of visiveis) {
    const chave = i.aula_numero === null ? "sem" : String(i.aula_numero);
    let grupo = aulas.find((a) => a.chave === chave);
    if (!grupo) {
      const titulo = i.aula_numero === null ? "Sem aula definida" : `Aula ${i.aula_numero}`;
      grupo = { chave, titulo, itens: [] };
      aulas.push(grupo);
    }
    grupo.itens.push(i);
  }

  async function alternarEstudado(id: string) {
    setErro(null);
    const marcar = !estudados.has(id);
    // muda na tela na hora ("otimista"); desfaz se o banco recusar
    setEstudados((s) => {
      const n = new Set(s);
      if (marcar) n.add(id);
      else n.delete(id);
      return n;
    });
    const supabase = criarClienteNavegador();
    const { error } = marcar
      ? await supabase.from("estudados").insert({ material_id: id, user_id: userId })
      : await supabase.from("estudados").delete().match({ material_id: id, user_id: userId });
    if (error) {
      setErro("Não consegui salvar. Verifique a internet e tente de novo.");
      setEstudados((s) => {
        const n = new Set(s);
        if (marcar) n.delete(id);
        else n.add(id);
        return n;
      });
    }
  }

  if (!itens.length) {
    return (
      <main className="px-4 py-10 text-center text-stone-500">
        <p className="text-4xl">🗂️</p>
        <p className="mt-2">Ainda não há material nesta prova.</p>
        <Link href={`/provas/${provaId}/novo`} className="botao mt-6 inline-flex w-auto px-6">
          ＋ Adicionar material
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-5 px-4 py-5 pb-16">
      {/* PROGRESSO */}
      <section className="cartao space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-stone-900">
            {pct === 100 ? "🎉 Tudo estudado!" : "Seu progresso"}
          </span>
          <span className="text-sm text-stone-600">
            {feitos} de {itens.length} · {pct}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-vinho-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-stone-500">Só você vê o seu checklist.</p>
      </section>

      {/* FILTROS */}
      <section className="space-y-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTROS.map((f) => {
            const qtd = itens.filter((i) => passaFiltro(i, f.id)).length;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  filtro === f.id ? "bg-vinho-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200"
                }`}
              >
                {f.rotulo} <span className="opacity-70">{qtd}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Alternador ativo={soImportantes} onClick={() => setSoImportantes((v) => !v)}>
            ⭐ Só importantes
          </Alternador>
          <Alternador ativo={ocultarEstudados} onClick={() => setOcultarEstudados((v) => !v)}>
            ✓ Esconder já estudados
          </Alternador>
          {fotos.length > 0 && (
            <button
              onClick={() => setGaleria(0)}
              className="rounded-full bg-stone-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              🖼️ Ver {fotos.length} {fotos.length === 1 ? "foto" : "fotos"} em tela cheia
            </button>
          )}
        </div>
      </section>

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      {visiveis.length === 0 && (
        <p className="py-8 text-center text-stone-500">Nada com esses filtros. 🙂</p>
      )}

      {/* MATERIAL, AULA POR AULA */}
      {aulas.map((aula) => {
        const tema = aula.itens.find((i) => i.tema)?.tema;
        const fotosAula = aula.itens.filter((i) => i.tipo === "foto" && i.url);
        const outros = aula.itens.filter((i) => !(i.tipo === "foto" && i.url));
        return (
          <section key={aula.chave} className="space-y-3">
            <h2 className="sticky top-[65px] z-[5] -mx-4 bg-papel/95 px-4 py-2 text-base font-bold text-vinho-700 backdrop-blur">
              {aula.titulo}
              {tema && <span className="font-medium text-stone-500"> · {tema}</span>}
            </h2>

            {/* Fotos da aula em grade: toque para abrir em tela cheia */}
            {fotosAula.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotosAula.map((f) => {
                  const feito = estudados.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setGaleria(fotos.findIndex((x) => x.id === f.id))}
                      className="relative aspect-square overflow-hidden rounded-xl bg-stone-200"
                      aria-label={`Abrir foto: ${f.titulo}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={f.titulo} loading="lazy" className="h-full w-full object-cover" />
                      {f.importantes > 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-amber-400 px-1.5 text-xs font-bold">⭐</span>
                      )}
                      {feito && (
                        <span className="absolute inset-0 flex items-center justify-center bg-emerald-900/40 text-3xl text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {outros.map((i) => {
              const feito = estudados.has(i.id);
              return (
                <article
                  key={i.id}
                  className={`cartao space-y-3 transition ${feito ? "border-emerald-200 bg-emerald-50/40" : ""}`}
                >
                  <header className="flex items-start gap-3">
                    <CaixaEstudado marcado={feito} onClick={() => alternarEstudado(i.id)} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${feito ? "text-stone-500 line-through" : "text-stone-900"}`}>
                        {i.titulo}
                      </p>
                      <p className="text-xs text-stone-500">
                        {INFO_TIPO[i.tipo].icone} {INFO_TIPO[i.tipo].rotulo} · {i.autor}
                        {i.importantes > 0 && <span className="font-semibold text-amber-700"> · ⭐ {i.importantes}</span>}
                      </p>
                    </div>
                  </header>
                  {!feito && <ConteudoMaterial m={i} url={i.url} />}
                  <Link href={`/materiais/${i.id}#comentarios`} className="inline-block text-sm text-vinho-600">
                    💬 {i.comentarios > 0 ? `${i.comentarios} comentário${i.comentarios > 1 ? "s" : ""}` : "Tirar dúvida"}
                  </Link>
                </article>
              );
            })}
          </section>
        );
      })}

      {galeria && galeria.fotos.length > 0 && (
        <Galeria
          fotos={galeria.fotos}
          inicio={galeria.inicio}
          estudados={estudados}
          onAlternarEstudado={alternarEstudado}
          onFechar={() => setGaleria(null)}
        />
      )}
    </main>
  );
}

function Alternador({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        ativo ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-white text-stone-600 ring-1 ring-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

function CaixaEstudado({ marcado, onClick }: { marcado: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={marcado}
      aria-label={marcado ? "Desmarcar: já estudei" : "Marcar: já estudei"}
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition active:scale-90 ${
        marcado ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white text-transparent"
      }`}
    >
      ✓
    </button>
  );
}
