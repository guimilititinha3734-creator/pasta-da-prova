"use client";

// Botão de formulário que pergunta "tem certeza?" antes de enviar
export function BotaoConfirmar({
  mensagem,
  children,
  className,
}: {
  mensagem: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
