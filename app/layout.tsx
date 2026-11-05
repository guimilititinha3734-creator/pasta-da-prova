import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RegistrarPWA } from "@/components/RegistrarPWA";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pasta da Prova",
  description: "O material da turma, organizado por prova.",
  // iPhone: ícone e comportamento de app ao adicionar à tela de início
  appleWebApp: { capable: true, title: "Pasta da Prova", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8c2a3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {/* Largura de celular, centralizado no computador */}
        <div className="mx-auto min-h-dvh max-w-lg">{children}</div>
        <RegistrarPWA />
      </body>
    </html>
  );
}
