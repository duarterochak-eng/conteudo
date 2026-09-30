import { existsSync } from "node:fs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // foto do "quem sou" da landing: sem public/kawan.jpg, a página mostra a inicial e não põe og:image
  env: { TEM_FOTO_KAWAN: existsSync(new URL("./public/kawan.jpg", import.meta.url)) ? "1" : "" },
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
