import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Uma versão por deploy: o service worker separa os caches por ela.
  env: {
    NEXT_PUBLIC_VERSAO: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? String(Date.now()),
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // App local-first: as telas do levantamento leem do IndexedDB no cliente e
    // por isso esperam o banco do aparelho (milissegundos, sem rede). A
    // validação de navegação instantânea fica só para segmentos que declararem
    // `instant` explicitamente.
    instantInsights: { validationLevel: 'manual-warning' },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
