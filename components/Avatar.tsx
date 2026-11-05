// Foto da pessoa (do Google) ou as iniciais do nome
export function Avatar({ nome, url, tamanho = 36 }: { nome: string; url?: string | null; tamanho?: number }) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={nome}
        width={tamanho}
        height={tamanho}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-vinho-100 font-semibold text-vinho-700"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
    >
      {iniciais || "?"}
    </div>
  );
}
