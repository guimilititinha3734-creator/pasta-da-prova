// O Next.js roda este arquivo antes de abrir qualquer página.
// Ele renova o login e protege as páginas de quem não está logado.
import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/sessao";

export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Não roda para arquivos estáticos (imagens, ícones, etc.)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.webmanifest|sw.js|offline.html|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
