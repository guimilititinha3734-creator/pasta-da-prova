// Comprime fotos NO NAVEGADOR antes de enviar (economiza muito espaço).
// Uma foto de celular de ~4 MB costuma virar ~250–400 KB.
import { LIMITES } from "./midia";

async function carregarImagem(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // respeita a rotação da foto (fotos "deitadas" do celular)
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch {
      /* cai no método antigo abaixo */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não consegui ler esta imagem."));
    img.src = URL.createObjectURL(arquivo);
  });
}

export async function comprimirFoto(arquivo: File): Promise<Blob> {
  const img = await carregarImagem(arquivo);
  const larg = "naturalWidth" in img ? img.naturalWidth : img.width;
  const alt = "naturalHeight" in img ? img.naturalHeight : img.height;

  const escala = Math.min(1, LIMITES.fotoLadoMaximo / Math.max(larg, alt));
  const w = Math.round(larg * escala);
  const h = Math.round(alt * escala);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // fundo branco para PNG com transparência
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", LIMITES.fotoQualidade));
  if (!blob) throw new Error("Falha ao comprimir a foto.");

  // Se por acaso a "comprimida" ficou maior (foto já pequena), usa a original
  if (blob.size >= arquivo.size && arquivo.type === "image/jpeg") return arquivo;
  return blob;
}
