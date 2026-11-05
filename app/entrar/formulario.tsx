"use client";

// Botão "Entrar com Google" + formulário do link mágico por e-mail
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";

export function FormularioEntrar({ voltar }: { voltar?: string }) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Depois do login, a pessoa volta para cá (e depois para onde estava)
  function urlDeRetorno() {
    const url = new URL("/auth/callback", window.location.origin);
    if (voltar?.startsWith("/")) url.searchParams.set("voltar", voltar);
    return url.toString();
  }

  async function entrarComGoogle() {
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlDeRetorno() },
    });
    if (error) setMensagem({ tipo: "erro", texto: error.message });
  }

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensagem(null);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlDeRetorno() },
    });
    setEnviando(false);
    if (error) {
      const limite = error.status === 429 || /rate limit/i.test(error.message);
      setMensagem({
        tipo: "erro",
        texto: limite
          ? "Muitos e-mails enviados nesta hora (limite do plano grátis). Use o login com Google ou tente mais tarde."
          : error.message,
      });
    } else {
      setMensagem({
        tipo: "ok",
        texto: "Pronto! Abra seu e-mail NESTE MESMO aparelho e navegador e toque no link.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={entrarComGoogle} className="botao-secundario py-3.5">
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Entrar com Google
      </button>

      <div className="flex items-center gap-3 text-sm text-stone-500">
        <div className="h-px flex-1 bg-stone-200" />
        ou receba um link por e-mail
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <form onSubmit={enviarLink} className="space-y-3">
        <input
          type="email"
          required
          placeholder="seu@email.com"
          autoComplete="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="botao" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar link mágico"}
        </button>
      </form>

      {mensagem && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            mensagem.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
