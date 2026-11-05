// Para onde o Google / o link do e-mail mandam a pessoa depois do login.
// Aqui trocamos o "code" recebido por uma sessão (cookies) e seguimos em frente.
import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const voltar = searchParams.get("voltar");
  const destino = voltar?.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";

  if (code) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
    return NextResponse.redirect(`${origin}/entrar?erro=${encodeURIComponent(error.code ?? "link")}`);
  }

  return NextResponse.redirect(`${origin}/entrar?erro=sem-codigo`);
}
