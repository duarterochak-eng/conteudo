export const metadata = { title: "Conteúdo", description: "Esteira de carrosséis e reels" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
