import { FormularioEntrar } from "./formulario";

export const metadata = { title: "Entrar · Pasta da Prova" };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string; erro?: string }>;
}) {
  const { voltar, erro } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-vinho-600 text-3xl shadow-lg">
          📚
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Pasta da Prova</h1>
        <p className="mt-2 text-stone-600">
          Fotos do quadro, vídeos, PDFs e anotações da turma — organizados por prova.
        </p>
      </div>

      {erro && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Não foi possível entrar. Tente de novo. ({erro})
        </p>
      )}

      <FormularioEntrar voltar={voltar} />
    </main>
  );
}
