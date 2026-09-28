export const metadata = { title: "@kawan.labs", description: "IA aplicada à operação de pequenas e médias empresas" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
