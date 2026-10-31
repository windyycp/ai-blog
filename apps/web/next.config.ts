import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 容器里输出 standalone，产物可 `node apps/web/server.js` 直接启动；本地构建保持默认
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  experimental: {
    // shared 源码在 apps/web 之外，必须显式允许
    externalDir: true,
  },
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'x-content-type-options', value: 'nosniff' },
          { key: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  // Turbopack 也需要知道 @ai-blog/shared 指向源码
  turbopack: {
    resolveAlias: {
      '@ai-blog/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
}

export default config
