import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">🔒</p>
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="text-stone-600">Ela não existe ou você não tem acesso (talvez não seja membro desta turma).</p>
      <Link href="/" className="botao w-auto px-6">
        Voltar ao início
      </Link>
    </main>
  );
}
