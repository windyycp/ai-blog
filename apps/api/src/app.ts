import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { HealthPayload } from '@ai-blog/shared'
import type { AppConfig } from './config/env'
import { registerErrorHandler } from './core/error-handler'
import { ok } from './core/response'
import { createDbPort } from './db/connect'
import { registerPostRoutes } from './modules/post/post.routes'
import { registerSiteRoutes } from './modules/site/site.routes'
import { registerTaxonomyRoutes } from './modules/taxonomy/taxonomy.routes'

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.env === 'test' ? false : { level: config.logLevel },
    trustProxy: true,
    bodyLimit: 256 * 1024,
  })

  const db = createDbPort(config.db)

  // 装饰器必须在任何 register 之前完成，子上下文才能读到
  app.decorate('db', db)
  app.decorate('config', config)
  app.addHook('onClose', async () => {
    await db.close()
  })

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
    maxAge: 86_400,
  })

  await app.register(helmet, {
    // 纯 JSON 服务，CSP 由 web 自己下发
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimitMax,
    timeWindow: '1 minute',
    // 健康检查不占配额，否则探针会被限流打成不健康
    allowList: [],
    keyGenerator: (request) => request.ip,
  })

  registerErrorHandler(app)

  await app.register(
    async (api) => {
      api.get('/health', async (request) => {
        const startedAt = Date.now()
        const alive = await request.server.db.ping()
        // 探活失败直接 500，让编排系统重启而不是返回一个假的 ok
        if (!alive) throw new Error('database ping failed')
        const payload: HealthPayload = {
          status: 'ok',
          driver: request.server.db.kind,
          latencyMs: Date.now() - startedAt,
          capabilities: request.server.db.capabilities,
        }
        return ok(payload)
      })

      registerPostRoutes(api)
      registerTaxonomyRoutes(api)
      registerSiteRoutes(api)
    },
    { prefix: '/api/v1' },
  )

  return app
}
