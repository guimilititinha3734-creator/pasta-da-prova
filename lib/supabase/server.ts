// Conexão com o Supabase usada NO SERVIDOR (páginas e "server actions").
// Ela lê o login da pessoa a partir dos cookies, então as regras de
// segurança (RLS) do banco sabem quem está pedindo os dados.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function criarClienteServidor() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Em páginas (Server Components) não dá para gravar cookies;
            // o arquivo proxy.ts cuida de renovar o login.
          }
        },
      },
    },
  );
}

// Atalho: devolve o cliente + a pessoa logada (ou manda para /entrar)
export async function exigirLogin() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}
