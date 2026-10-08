import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Buddy · Cenografia",
  description: "Crie stands com medidas, materiais e texturas e gere scripts para Blender ou 3ds Max.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
