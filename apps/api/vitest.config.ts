import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // 与 tsconfig paths 保持一致：直接引用 shared 源码，不经过 node_modules
    alias: {
      '@ai-blog/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    hookTimeout: 20_000,
  },
})
