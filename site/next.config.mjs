/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // só a palavra tabela; /isca/tabela continua valendo para links já enviados
    return [{ source: "/tabela", destination: "/isca/tabela" }];
  },
};
export default nextConfig;
