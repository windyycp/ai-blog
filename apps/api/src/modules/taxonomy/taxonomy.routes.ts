import type { FastifyInstance } from 'fastify'
import { ok } from '../../core/response'
import { createTaxonomyRepository } from './taxonomy.repository'

export function registerTaxonomyRoutes(app: FastifyInstance): void {
  const repo = createTaxonomyRepository(app.db)

  app.get('/tags', async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=300')
    return ok(await repo.tags())
  })

  app.get('/categories', async (_request, reply) => {
    reply.header('cache-control', 'public, max-age=300')
    return ok(await repo.categories())
  })
}
