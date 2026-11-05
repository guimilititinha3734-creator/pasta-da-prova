// Regras de tamanho e utilidades para fotos, vídeos, PDFs e links

export const MB = 1024 * 1024;

/** Limites de tamanho por arquivo (o espaço total é por turma — veja supabase/03) */
export const LIMITES = {
  video: 25 * MB,
  pdf: 20 * MB,
  fotoLadoMaximo: 1600, // pixels (lado maior depois da compressão)
  fotoQualidade: 0.75, // 0 a 1 (JPEG)
};

export type TipoMaterial = "foto" | "video" | "video_link" | "pdf" | "nota";

export const INFO_TIPO: Record<TipoMaterial, { rotulo: string; icone: string }> = {
  foto: { rotulo: "Foto", icone: "📷" },
  video: { rotulo: "Vídeo", icone: "🎬" },
  video_link: { rotulo: "Link de vídeo", icone: "🔗" },
  pdf: { rotulo: "PDF", icone: "📄" },
  nota: { rotulo: "Anotação", icone: "📝" },
};

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(1).replace(".", ",")} MB`;
  return `${(bytes / (1024 * MB)).toFixed(2).replace(".", ",")} GB`;
}

/** Transforma um link do YouTube/Drive no endereço que pode ser embutido no app */
export function linkParaEmbed(url: string): { tipo: "youtube" | "drive"; src: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    if (id) return { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (u.pathname === "/watch" && v) return { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${v}` };
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
    if (m) return { tipo: "youtube", src: `https://www.youtube-nocookie.com/embed/${m[2]}` };
  }
  if (host === "drive.google.com") {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/);
    const id = m?.[1] ?? u.searchParams.get("id");
    if (id && id !== "EXEMPLO") return { tipo: "drive", src: `https://drive.google.com/file/d/${id}/preview` };
  }
  return null;
}

export function ehLinkDeVideoValido(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
