import type { FastifyInstance } from 'fastify'
import { ok } from '../../core/response'
import { createSiteService } from './site.service'

export function registerSiteRoutes(app: FastifyInstance): void {
  const service = createSiteService(app.db)

  app.get('/site/meta', async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=600')
    return ok(await service.meta())
  })
}
