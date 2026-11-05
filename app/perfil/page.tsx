// Meu perfil: trocar o nome que aparece para os colegas
import { exigirLogin } from "@/lib/supabase/server";
import { Cabecalho } from "@/components/Cabecalho";
import { Avatar } from "@/components/Avatar";
import { sair } from "@/app/acoes";
import { FormularioNome } from "./formulario";

export default async function Perfil() {
  const { supabase, user } = await exigirLogin();
  const { data: perfil } = await supabase.from("profiles").select("nome, avatar_url").eq("id", user.id).single();

  return (
    <>
      <Cabecalho titulo="Meu perfil" voltarPara="/" />
      <main className="space-y-6 px-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <Avatar nome={perfil?.nome ?? "?"} url={perfil?.avatar_url} tamanho={80} />
          <p className="text-sm text-stone-500">{user.email}</p>
        </div>

        <FormularioNome nomeAtual={perfil?.nome ?? ""} />

        <form action={sair}>
          <button className="botao-secundario">Sair da conta</button>
        </form>
      </main>
    </>
  );
}
