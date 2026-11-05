"use client";

// Formulário para postar material: foto, vídeo (arquivo ou link), PDF ou anotação.
// Os arquivos vão DIRETO do navegador para o Supabase Storage (não passam pelo servidor).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { comprimirFoto } from "@/lib/comprimir";
import { ehLinkDeVideoValido, formatarBytes, INFO_TIPO, LIMITES, linkParaEmbed } from "@/lib/midia";

type Aba = "foto" | "video" | "pdf" | "nota";
type ModoVideo = "link" | "arquivo";

function idAleatorio() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MSG_SEM_ESPACO =
  "O espaço de arquivos desta turma acabou. Vocês ainda podem postar anotações e links de vídeo (YouTube/Drive). " +
  "Para liberar espaço, apaguem materiais antigos ou falem com o responsável pelo app.";

function extensao(nome: string, padrao: string) {
  const ext = nome.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : padrao;
}

export function FormularioMaterial({
  provaId,
  temasSugeridos,
  ultimaAula,
  espacoUsado,
  espacoCota,
  tipoInicial,
}: {
  provaId: string;
  temasSugeridos: string[];
  ultimaAula: number | null;
  espacoUsado: number;
  espacoCota: number; // "armário" da turma (0 = turma sem espaço para arquivos)
  tipoInicial?: string;
}) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>(
    (["foto", "video", "pdf", "nota"] as const).find((t) => t === tipoInicial) ?? "foto",
  );
  const [modoVideo, setModoVideo] = useState<ModoVideo>("link");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [titulo, setTitulo] = useState("");
  const [aula, setAula] = useState(ultimaAula !== null ? String(ultimaAula) : "");
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const espacoLivre = Math.max(0, espacoCota - espacoUsado);
  // Turma sem espaço: só anotações e links de vídeo funcionam
  const semEspaco = espacoLivre <= 0;
  const precisaArquivo = aba === "foto" || aba === "pdf" || (aba === "video" && modoVideo === "arquivo");
  const tamanhoTotal = arquivos.reduce((s, a) => s + a.size, 0);

  function trocarAba(nova: Aba) {
    setAba(nova);
    setArquivos([]);
    setErro(null);
  }

  function escolherArquivos(lista: FileList | null) {
    setErro(null);
    const escolhidos = Array.from(lista ?? []);
    if (aba === "video" && escolhidos[0] && escolhidos[0].size > LIMITES.video) {
      setErro(
        `Este vídeo tem ${formatarBytes(escolhidos[0].size)} — o limite é ${formatarBytes(LIMITES.video)}. ` +
          "Suba no YouTube (não listado) ou no Google Drive e cole o link.",
      );
      setArquivos([]);
      return;
    }
    if (aba === "pdf" && escolhidos[0] && escolhidos[0].size > LIMITES.pdf) {
      setErro(`Este PDF tem ${formatarBytes(escolhidos[0].size)} — o limite é ${formatarBytes(LIMITES.pdf)}.`);
      setArquivos([]);
      return;
    }
    setArquivos(escolhidos);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const aulaNumero = aula.trim() === "" ? null : Number(aula);
    if (aulaNumero !== null && (!Number.isInteger(aulaNumero) || aulaNumero < 0 || aulaNumero > 999)) {
      return setErro("O número da aula precisa ser um número inteiro (ex.: 3).");
    }

    const supabase = criarClienteNavegador();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setErro("Sua sessão expirou. Entre de novo.");

    const base = { prova_id: provaId, autor_id: user.id, aula_numero: aulaNumero, tema: tema.trim() };

    setEnviando(true);
    try {
      // ---------- ANOTAÇÃO ----------
      if (aba === "nota") {
        if (!texto.trim()) throw new Error("Escreva a anotação.");
        const { error } = await supabase.from("materiais").insert({
          ...base,
          tipo: "nota",
          titulo: titulo.trim() || "Anotação",
          texto: texto.trim(),
        });
        if (error) throw error;
      }

      // ---------- LINK DE VÍDEO ----------
      else if (aba === "video" && modoVideo === "link") {
        if (!ehLinkDeVideoValido(link.trim())) throw new Error("Cole um link válido (começando com https://).");
        const { error } = await supabase.from("materiais").insert({
          ...base,
          tipo: "video_link",
          titulo: titulo.trim() || "Vídeo",
          texto: texto.trim(),
          link_url: link.trim(),
        });
        if (error) throw error;
      }

      // ---------- ARQUIVOS (fotos, vídeo, PDF) ----------
      else {
        if (!arquivos.length) throw new Error("Escolha um arquivo.");
        if (semEspaco) throw new Error(MSG_SEM_ESPACO);
        if (tamanhoTotal > espacoLivre && aba !== "foto") {
          throw new Error(
            `Este arquivo tem ${formatarBytes(tamanhoTotal)}, mas a turma só tem ${formatarBytes(espacoLivre)} livres. ` +
              "Use um link (YouTube/Drive) ou apaguem materiais antigos.",
          );
        }

        for (let i = 0; i < arquivos.length; i++) {
          const arq = arquivos[i]!;
          let corpo: Blob = arq;
          let tipoConteudo = arq.type;
          let ext = extensao(arq.name, "bin");

          if (aba === "foto") {
            setStatus(`Comprimindo foto ${i + 1} de ${arquivos.length}…`);
            corpo = await comprimirFoto(arq);
            tipoConteudo = "image/jpeg";
            ext = "jpg";
          } else if (aba === "pdf") {
            tipoConteudo = "application/pdf";
            ext = "pdf";
          } else {
            tipoConteudo = arq.type || "video/mp4";
          }

          setStatus(
            arquivos.length > 1
              ? `Enviando ${i + 1} de ${arquivos.length} (${formatarBytes(corpo.size)})…`
              : `Enviando (${formatarBytes(corpo.size)})… não feche esta tela.`,
          );

          const caminho = `${provaId}/${idAleatorio()}.${ext}`;
          const { error: erroUpload } = await supabase.storage
            .from("materiais")
            .upload(caminho, corpo, { contentType: tipoConteudo, upsert: false });
          if (erroUpload) {
            // O banco recusa o upload quando a turma passou do limite
            if (/row-level security|violates|unauthorized|403/i.test(erroUpload.message)) throw new Error(MSG_SEM_ESPACO);
            throw new Error(`Falha no envio: ${erroUpload.message}`);
          }

          const tituloFinal =
            titulo.trim() ||
            (aba === "foto" ? "Foto do quadro" : aba === "pdf" ? arq.name.replace(/\.pdf$/i, "") : "Vídeo da aula");

          const { error } = await supabase.from("materiais").insert({
            ...base,
            tipo: aba,
            titulo: arquivos.length > 1 ? `${tituloFinal} (${i + 1}/${arquivos.length})` : tituloFinal,
            texto: texto.trim(),
            arquivo_path: caminho,
            tamanho_bytes: corpo.size,
          });
          if (error) {
            await supabase.storage.from("materiais").remove([caminho]); // não deixa arquivo órfão
            throw error;
          }
        }
      }

      setStatus("Pronto! ✅");
      router.push(`/provas/${provaId}`);
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setStatus(null);
      setEnviando(false);
    }
  }

  const embed = aba === "video" && modoVideo === "link" && link ? linkParaEmbed(link.trim()) : null;

  return (
    <form onSubmit={enviar} className="space-y-5">
      {/* Abas de tipo */}
      <div className="grid grid-cols-4 gap-2">
        {(["foto", "video", "pdf", "nota"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => trocarAba(t)}
            className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition ${
              aba === t ? "border-vinho-500 bg-vinho-50 text-vinho-700" : "border-stone-200 bg-white text-stone-600"
            }`}
          >
            <span className="text-2xl">{INFO_TIPO[t].icone}</span>
            {t === "foto" ? "Fotos" : INFO_TIPO[t].rotulo}
          </button>
        ))}
      </div>

      {/* FOTOS */}
      {aba === "foto" && (
        <div className="space-y-2">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-6 text-center hover:border-vinho-500">
            <span className="text-4xl">📷</span>
            <span className="font-semibold text-stone-800">Tirar foto ou escolher da galeria</span>
            <span className="text-xs text-stone-500">Pode escolher várias. Elas são comprimidas antes de enviar.</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => escolherArquivos(e.target.files)}
            />
          </label>
          {arquivos.length > 0 && <ListaArquivos arquivos={arquivos} />}
        </div>
      )}

      {/* VÍDEO */}
      {aba === "video" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-medium">
            {(["link", "arquivo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModoVideo(m);
                  setArquivos([]);
                  setErro(null);
                }}
                className={`rounded-lg py-2 ${modoVideo === m ? "bg-white shadow-sm" : "text-stone-500"}`}
              >
                {m === "link" ? "🔗 Colar link (recomendado)" : `⬆️ Enviar (até ${formatarBytes(LIMITES.video)})`}
              </button>
            ))}
          </div>

          {modoVideo === "link" ? (
            <div className="space-y-2">
              <input
                type="url"
                inputMode="url"
                placeholder="https://youtu.be/… ou https://drive.google.com/…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="campo"
              />
              <p className="text-xs text-stone-500">
                YouTube: envie como <b>não listado</b>. Google Drive: em Compartilhar, escolha <b>&quot;Qualquer pessoa
                com o link&quot;</b>. Links não gastam o espaço do app.
              </p>
              {embed && (
                <div className="aspect-video overflow-hidden rounded-xl bg-black">
                  <iframe src={embed.src} className="h-full w-full" title="Prévia" allowFullScreen />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-6 text-center hover:border-vinho-500">
                <span className="text-4xl">🎬</span>
                <span className="font-semibold text-stone-800">Escolher vídeo</span>
                <span className="text-xs text-stone-500">
                  Máximo {formatarBytes(LIMITES.video)} (≈ 1–2 min de celular). Para vídeos maiores, use link.
                </span>
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  onChange={(e) => escolherArquivos(e.target.files)}
                />
              </label>
              {arquivos.length > 0 && <ListaArquivos arquivos={arquivos} />}
            </div>
          )}
        </div>
      )}

      {/* PDF */}
      {aba === "pdf" && (
        <div className="space-y-2">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-6 text-center hover:border-vinho-500">
            <span className="text-4xl">📄</span>
            <span className="font-semibold text-stone-800">Escolher PDF</span>
            <span className="text-xs text-stone-500">Máximo {formatarBytes(LIMITES.pdf)}.</span>
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => escolherArquivos(e.target.files)}
            />
          </label>
          {arquivos.length > 0 && <ListaArquivos arquivos={arquivos} />}
        </div>
      )}

      {/* CAMPOS COMUNS */}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Título {aba !== "nota" && "(opcional)"}</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={120}
          placeholder={
            aba === "foto" ? "Ex.: Quadro — poder constituinte" : aba === "nota" ? "Ex.: Resumo da aula" : "Ex.: Explicação do art. 5º"
          }
          className="campo"
        />
      </label>

      <div className="grid grid-cols-[96px_1fr] gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Aula nº</span>
          <input
            value={aula}
            onChange={(e) => setAula(e.target.value)}
            inputMode="numeric"
            placeholder="3"
            className="campo"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Tema</span>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            list="temas"
            placeholder="Ex.: Controle de constitucionalidade"
            className="campo"
          />
          <datalist id="temas">
            {temasSugeridos.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">
          {aba === "nota" ? "Anotação" : "Descrição (opcional)"}
        </span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={aba === "nota" ? 10 : 3}
          maxLength={20000}
          placeholder={aba === "nota" ? "Escreva aqui o resumo, os artigos, o que o professor enfatizou…" : ""}
          className="campo"
        />
      </label>

      {semEspaco && precisaArquivo && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ☁️ {MSG_SEM_ESPACO}
        </p>
      )}

      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}
      {status && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{status}</p>}

      <button className="botao py-4 text-base" disabled={enviando || (semEspaco && precisaArquivo)}>
        {enviando ? "Enviando…" : "Publicar na pasta da prova"}
      </button>

      <p className="text-center text-xs text-stone-500">
        {espacoCota > 0
          ? `Espaço livre da turma: ${formatarBytes(espacoLivre)} de ${formatarBytes(espacoCota)}`
          : "Esta turma ainda não tem espaço para arquivos (anotações e links liberados)."}
      </p>
    </form>
  );
}

function ListaArquivos({ arquivos }: { arquivos: File[] }) {
  return (
    <ul className="space-y-1 text-sm text-stone-600">
      {arquivos.map((a, i) => (
        <li key={i} className="flex justify-between gap-2 rounded-lg bg-stone-100 px-3 py-2">
          <span className="truncate">{a.name}</span>
          <span className="shrink-0 text-stone-500">{formatarBytes(a.size)}</span>
        </li>
      ))}
    </ul>
  );
}
