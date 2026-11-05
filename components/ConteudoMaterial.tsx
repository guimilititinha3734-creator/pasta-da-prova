// Mostra o conteúdo de um material conforme o tipo
// (foto, vídeo, link do YouTube/Drive, PDF ou anotação)
import Link from "next/link";
import { linkParaEmbed } from "@/lib/midia";
import type { Material } from "@/lib/tipos";

export function ConteudoMaterial({
  m,
  url,
  resumido,
}: {
  m: Pick<Material, "id" | "tipo" | "titulo" | "texto" | "link_url">;
  url?: string; // link temporário do arquivo (foto/vídeo/PDF)
  resumido?: boolean; // na lista da prova mostramos versão compacta
}) {
  if (m.tipo === "foto") {
    if (!url) return <ArquivoIndisponivel />;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={m.titulo}
        loading="lazy"
        className={`w-full rounded-xl bg-stone-100 object-cover ${resumido ? "max-h-64" : ""}`}
      />
    );
    return resumido ? <Link href={`/materiais/${m.id}`}>{img}</Link> : img;
  }

  if (m.tipo === "video") {
    if (!url) return <ArquivoIndisponivel />;
    return <video src={url} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" />;
  }

  if (m.tipo === "pdf") {
    if (!url) return <ArquivoIndisponivel />;
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 hover:bg-stone-100"
      >
        <span className="text-3xl">📄</span>
        <span className="flex-1 text-sm font-medium text-stone-800">Abrir PDF</span>
        <span className="text-stone-400">↗</span>
      </a>
    );
  }

  if (m.tipo === "video_link" && m.link_url) {
    const embed = linkParaEmbed(m.link_url);
    return (
      <div className="space-y-2">
        {embed && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={embed.src}
              title={m.titulo}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}
        <a
          href={m.link_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm hover:bg-stone-100"
        >
          <span>{m.link_url.includes("drive.google") ? "🟢 Google Drive" : "▶️ Abrir link"}</span>
          <span className="flex-1 truncate text-stone-500">{m.link_url}</span>
          <span className="text-stone-400">↗</span>
        </a>
        {m.texto && <p className="whitespace-pre-line text-sm text-stone-700">{m.texto}</p>}
      </div>
    );
  }

  // Anotação em texto
  return (
    <p className={`whitespace-pre-line text-[15px] leading-relaxed text-stone-800 ${resumido ? "line-clamp-6" : ""}`}>
      {m.texto}
    </p>
  );
}

function ArquivoIndisponivel() {
  return (
    <p className="rounded-xl bg-stone-100 p-3 text-sm text-stone-500">Arquivo indisponível (pode ter sido apagado).</p>
  );
}
