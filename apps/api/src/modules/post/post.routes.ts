import type { FastifyInstance } from 'fastify'
import {
  buildPageMeta,
  listPostsQuerySchema,
  searchQuerySchema,
  SEARCH_PAGE_SIZE,
  slugParamSchema,
} from '@ai-blog/shared'
import { ok } from '../../core/response'
import { createPostService } from './post.service'

const RELATED_LIMIT = 3

export function registerPostRoutes(app: FastifyInstance): void {
  const service = createPostService(app.db)

  app.get('/posts', async (request, reply) => {
    const query = listPostsQuerySchema.parse(request.query)
    const { items, total } = await service.list(query)
    reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=300')
    return ok(items, buildPageMeta(total, query.page, query.pageSize))
  })

  app.get('/posts/:slug', async (request, reply) => {
    const { slug } = slugParamSchema.parse(request.params)
    const detail = await service.detail(slug)
    reply.header('cache-control', 'public, max-age=300, stale-while-revalidate=600')
    return ok(detail)
  })

  app.get('/posts/:slug/related', async (request, reply) => {
    const { slug } = slugParamSchema.parse(request.params)
    const items = await service.related(slug, RELATED_LIMIT)
    reply.header('cache-control', 'public, max-age=300')
    return ok(items)
  })

  app.post(
    '/posts/:slug/view',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { slug } = slugParamSchema.parse(request.params)
      await service.recordView(slug)
      reply.header('cache-control', 'no-store')
      return ok({ slug })
    },
  )

  app.get('/archive', async (_request, reply) => {
    const years = await service.archive()
    reply.header('cache-control', 'public, max-age=300')
    return ok(years)
  })

  app.get('/search', async (request, reply) => {
    const query = searchQuerySchema.parse(request.query)
    const { items, total } = await service.list({
      page: 1,
      pageSize: query.limit ?? SEARCH_PAGE_SIZE,
      q: query.q,
    })
    reply.header('cache-control', 'public, max-age=30')
    // 一期只有 LIKE 通道；二期 PG 上 fts=true 时改走 tsvector
    return ok({ items, total, engine: app.db.capabilities.fts ? 'fts' : 'like' })
  })
}
