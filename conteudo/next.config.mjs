/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/render": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};
export default nextConfig;
