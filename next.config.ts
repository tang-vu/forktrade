import type { NextConfig } from 'next';
const config: NextConfig = {
  agentRules: false,
  serverExternalPackages: ['@somnia-chain/markets-sdk','pg','@electric-sql/pglite'],
  outputFileTracingExcludes: {
    '/*':['./.local/**/*','./.env*','./tools/**/*','./feedback/**/*','./evidence/**/*','./db/migrations/**/*','**/node_modules/@electric-sql/pglite*','**/node_modules/@electric-sql/pglite*/**/*']
  },
  poweredByHeader: false,
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'Referrer-Policy', value: 'same-origin'},
      {key: 'X-Frame-Options', value: 'DENY'},
      {key: 'Cache-Control', value: 'no-store'},
      {key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}
    ]}];
  }
};
export default config;
