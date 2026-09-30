/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // só a palavra tabela; /isca/tabela continua valendo para links já enviados
      { source: "/tabela", destination: "/isca/tabela" },
      // o link antigo da tabela (e-mails e DMs já enviados) continua abrindo a página nova
      { source: "/tabela-ia/index.html", destination: "/tabela-ia" },
    ];
  },
};
export default nextConfig;
