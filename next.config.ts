import type { NextConfig } from 'next';

// ─── Static export for GitHub Pages ──────────────────────────────────────────
// Set NEXT_PUBLIC_STATIC_EXPORT=true + NEXT_PUBLIC_BASE_PATH=/repo-name in CI.
// Local dev: neither variable set → normal Next.js with live API routes.

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';
const basePath       = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output:        isStaticExport ? 'export' : undefined,
  basePath,
  trailingSlash: isStaticExport,

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'mlbb-stats.rone.dev' },
      { protocol: 'https', hostname: 'akmweb.youngjoygame.com' },
      { protocol: 'https', hostname: 'i.im.ge' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
    ],
  },
};

export default nextConfig;
