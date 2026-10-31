import type { ArchiveYear, PostDetail, PostSummary } from '@ai-blog/shared'
import { AppError } from '../../core/errors'
import { toDetail, toSummary } from './post.mapper'
import { createPostRepository, type ListParams } from './post.repository'
import type { DbPort } from '../../db/port'

export function createPostService(port: DbPort) {
  const repo = createPostRepository(port)

  return {
    async list(params: ListParams): Promise<{ items: PostSummary[]; total: number }> {
      const { rows, tags, total } = await repo.list(params)
      return { items: rows.map((row) => toSummary(row, tags.get(row.id) ?? [])), total }
    },

    async detail(slug: string): Promise<PostDetail> {
      const found = await repo.findBySlug(slug)
      if (!found) throw AppError.notFound('文章不存在')
      const { prev, next } = await repo.neighbours(found.row)
      return toDetail(found.row, found.tags, prev, next)
    },

    async related(slug: string, limit = 3): Promise<PostSummary[]> {
      const found = await repo.findBySlug(slug)
      if (!found) throw AppError.notFound('文章不存在')
      const { rows, tags } = await repo.related(found.row, limit)
      return rows.map((row) => toSummary(row, tags.get(row.id) ?? []))
    },

    async recordView(slug: string): Promise<void> {
      const updated = await repo.incrementView(slug)
      if (!updated) throw AppError.notFound('文章不存在')
    },

    /** 归档在 JS 侧分组，避免依赖 any 引擎的日期函数 */
    async archive(): Promise<ArchiveYear[]> {
      const { rows, tags } = await repo.allPublished()
      const years = new Map<string, Map<string, PostSummary[]>>()

      for (const row of rows) {
        if (row.publishedAt === null) continue
        const date = new Date(row.publishedAt)
        const year = String(date.getUTCFullYear())
        const month = String(date.getUTCMonth() + 1).padStart(2, '0')
        const months = years.get(year) ?? new Map<string, PostSummary[]>()
        const list = months.get(month) ?? []
        list.push(toSummary(row, tags.get(row.id) ?? []))
        months.set(month, list)
        years.set(year, months)
      }

      return [...years.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([year, months]) => {
          const monthList = [...months.entries()]
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, posts]) => ({ month, count: posts.length, posts }))
          return {
            year,
            count: monthList.reduce((sum, m) => sum + m.count, 0),
            months: monthList,
          }
        })
    },
  }
}

export type PostService = ReturnType<typeof createPostService>
