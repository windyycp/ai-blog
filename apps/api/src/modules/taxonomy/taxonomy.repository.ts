import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import type { CategoryRef, TagRef } from '@ai-blog/shared'
import { queryContext, type DbPort } from '../../db/port'

export function createTaxonomyRepository(port: DbPort) {
  const { db, s, d } = queryContext(port)

  return {
    /** 计数只统计已发布文章，草稿不计入标签云 */
    async tags(): Promise<TagRef[]> {
      const rows = await db
        .select({ slug: s.tags.slug, name: s.tags.name, total: count(s.posts.id) })
        .from(s.tags)
        .leftJoin(s.postTags, eq(s.postTags.tagId, s.tags.id))
        .leftJoin(s.posts, and(eq(s.posts.id, s.postTags.postId), eq(s.posts.status, 'published')))
        .groupBy(s.tags.id, s.tags.slug, s.tags.name)
        .orderBy(desc(sql`count(${s.posts.id})`), asc(s.tags.name))
      return rows.map((r) => ({ slug: r.slug, name: r.name, count: d.toNumber(r.total) }))
    },

    async categories(): Promise<CategoryRef[]> {
      const rows = await db
        .select({ slug: s.categories.slug, name: s.categories.name, total: count(s.posts.id) })
        .from(s.categories)
        .leftJoin(s.posts, and(eq(s.posts.categoryId, s.categories.id), eq(s.posts.status, 'published')))
        .groupBy(s.categories.id, s.categories.slug, s.categories.name, s.categories.sortOrder)
        .orderBy(asc(s.categories.sortOrder), asc(s.categories.name))
      return rows.map((r) => ({ slug: r.slug, name: r.name, count: d.toNumber(r.total) }))
    },
  }
}

export type TaxonomyRepository = ReturnType<typeof createTaxonomyRepository>
