// PLANOS PAGOS — para mudar nomes, preços ou tamanhos, altere só aqui.
// Cada plano vale para a TURMA inteira, por 1 semestre (6 meses).

export const GB = 1024 * 1024 * 1024;

export type Plano = {
  id: string;
  nome: string; // aparece no selo da turma e no painel
  bytes: number;
  preco: number; // em reais, por semestre
  destaque?: string;
  descricao: string;
};

export const MESES_POR_PLANO = 6;

export const PLANOS: Plano[] = [
  {
    id: "pro-1gb",
    nome: "Pro 1 GB",
    bytes: 1 * GB,
    preco: 60,
    descricao: "Para turmas que postam fotos do quadro e PDFs o semestre inteiro.",
  },
  {
    id: "pro-5gb",
    nome: "Pro 5 GB",
    bytes: 5 * GB,
    preco: 120,
    destaque: "Mais escolhido",
    descricao: "Espaço de sobra para fotos, PDFs e alguns vídeos curtos enviados direto.",
  },
  {
    id: "pro-10gb",
    nome: "Pro 10 GB",
    bytes: 10 * GB,
    preco: 200,
    descricao: "Para turmas grandes ou que gravam muitas aulas em vídeo.",
  },
];

export function formatarPreco(reais: number) {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

/** Link do WhatsApp com a mensagem do pedido já escrita */
export function linkPedido(numero: string, plano: Plano, turma: { nome: string; codigo: string }) {
  const texto =
    `Olá! Quero contratar o plano *${plano.nome}* (${formatarPreco(plano.preco)}/semestre) ` +
    `do Pasta da Prova para a turma "${turma.nome}" (código ${turma.codigo}).`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
