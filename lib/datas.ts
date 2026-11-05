// Datas no fuso de Brasília, sem surpresas de "um dia a menos"

/** Data de hoje em Brasília, no formato AAAA-MM-DD */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Quantos dias faltam (negativo = já passou) até uma data AAAA-MM-DD */
export function diasAte(dataISO: string): number {
  const [a1, m1, d1] = hojeISO().split("-").map(Number);
  const [a2, m2, d2] = dataISO.split("-").map(Number);
  const ms = Date.UTC(a2!, m2! - 1, d2!) - Date.UTC(a1!, m1! - 1, d1!);
  return Math.round(ms / 86_400_000);
}

/** Texto da contagem regressiva + cor */
export function contagem(dataISO: string): { texto: string; tom: "urgente" | "breve" | "longe" | "passou" } {
  const d = diasAte(dataISO);
  if (d < 0) return { texto: d === -1 ? "foi ontem" : `foi há ${-d} dias`, tom: "passou" };
  if (d === 0) return { texto: "é hoje!", tom: "urgente" };
  if (d === 1) return { texto: "é amanhã!", tom: "urgente" };
  if (d <= 7) return { texto: `faltam ${d} dias`, tom: "urgente" };
  if (d <= 14) return { texto: `faltam ${d} dias`, tom: "breve" };
  return { texto: `faltam ${d} dias`, tom: "longe" };
}

/** "12 de nov." */
export function dataCurta(dataISO: string): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(a!, m! - 1, d!)),
  );
}

/** "qui., 12 de novembro de 2026" */
export function dataLonga(dataISO: string): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(Date.UTC(a!, m! - 1, d!)),
  );
}

/** Data/hora de postagem: "5 nov., 15:42" */
export function quando(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(isoTimestamp));
}
