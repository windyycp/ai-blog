import { and, asc, count, desc, eq, gt, inArray, lt, ne, notInArray, or, sql } from 'drizzle-orm'
import type { QueryContext } from '../../db/port'
import { queryContext, type DbPort } from '../../db/port'

export interface PostRow {
  id: number
  slug: string
  title: string
  excerpt: string | null
  contentMd: string
  coverUrl: string | null
  publishedAt: number | null
  readingTime: number
  featured: boolean
  viewCount: number
  updatedAt: number
  categorySlug: string | null
  categoryName: string | null
}

export interface ListParams {
  page: number
  pageSize: number
  tag?: string
  category?: string
  q?: string
  featured?: boolean
}

export interface TagRow {
  postId: number
  slug: string
  name: string
}

function selection(s: QueryContext['s']) {
  return {
    id: s.posts.id,
    slug: s.posts.slug,
    title: s.posts.title,
    excerpt: s.posts.excerpt,
    contentMd: s.posts.contentMd,
    coverUrl: s.posts.coverUrl,
    publishedAt: s.posts.publishedAt,
    readingTime: s.posts.readingTime,
    featured: s.posts.featured,
    viewCount: s.posts.viewCount,
    updatedAt: s.posts.updatedAt,
    categorySlug: s.categories.slug,
    categoryName: s.categories.name,
  }
}

const listed = (s: QueryContext['s']) => and(eq(s.posts.status, 'published'), ltePublished(s))

function ltePublished(s: QueryContext['s']) {
  return sql`${s.posts.publishedAt} is not null and ${s.posts.publishedAt} <= ${Date.now()}`
}

/** 用户关键词里的通配符直接剔除，避免 LIKE 语义被污染 */
const sanitizeKeyword = (input: string) => input.replace(/[%_\\]/g, '').trim()

export function createPostRepository(port: DbPort) {
  const { db, s, d } = queryContext(port)

  async function loadTags(postIds: number[]): Promise<Map<number, TagRow[]>> {
    const map = new Map<number, TagRow[]>()
    if (postIds.length === 0) return map
    const rows = await db
      .select({ postId: s.postTags.postId, slug: s.tags.slug, name: s.tags.name })
      .from(s.postTags)
      .innerJoin(s.tags, eq(s.tags.id, s.postTags.tagId))
      .where(inArray(s.postTags.postId, postIds))
    for (const row of rows) {
      const list = map.get(row.postId) ?? []
      list.push({ postId: row.postId, slug: row.slug, name: row.name })
      map.set(row.postId, list)
    }
    return map
  }

  async function tagIdsBySlug(slug: string): Promise<number[]> {
    const rows = await db.select({ id: s.tags.id }).from(s.tags).where(eq(s.tags.slug, slug))
    return rows.map((r) => r.id)
  }

  return {
    /** 列表 + 总数：一次 join 分类，一次批量取标签，避免 N+1 */
    async list(params: ListParams): Promise<{ rows: PostRow[]; tags: Map<number, TagRow[]>; total: number }> {
      const conditions = [listed(s)]
      if (params.category) conditions.push(eq(s.categories.slug, params.category))
      if (params.featured !== undefined) conditions.push(eq(s.posts.featured, params.featured))
      if (params.q) {
        const pattern = `%${sanitizeKeyword(params.q)}%`
        conditions.push(or(d.ciLike(s.posts.title, pattern), d.ciLike(s.posts.excerpt, pattern))!)
      }
      if (params.tag) {
        const ids = await tagIdsBySlug(params.tag)
        if (ids.length === 0) return { rows: [], tags: new Map(), total: 0 }
        conditions.push(
          inArray(
            s.posts.id,
            db.select({ id: s.postTags.postId }).from(s.postTags).where(inArray(s.postTags.tagId, ids)),
          ),
        )
      }

      const where = and(...conditions)
      const offset = (params.page - 1) * params.pageSize

      const [rows, totalRows] = await Promise.all([
        db
          .select(selection(s))
          .from(s.posts)
          .leftJoin(s.categories, eq(s.categories.id, s.posts.categoryId))
          .where(where)
          // 稳定次序：PG 在等值排序键上不保证顺序，必须带 id 兜底
          .orderBy(desc(s.posts.publishedAt), desc(s.posts.id))
          .limit(params.pageSize)
          .offset(offset),
        db
          .select({ total: count() })
          .from(s.posts)
          .leftJoin(s.categories, eq(s.categories.id, s.posts.categoryId))
          .where(where),
      ])

      const tags = await loadTags(rows.map((r) => r.id))
      return { rows: rows as PostRow[], tags, total: d.toNumber(totalRows[0]?.total) }
    },

    async findBySlug(slug: string): Promise<{ row: PostRow; tags: TagRow[] } | null> {
      const rows = await db
        .select(selection(s))
        .from(s.posts)
        .leftJoin(s.categories, eq(s.categories.id, s.posts.categoryId))
        .where(and(eq(s.posts.slug, slug), listed(s)))
        .limit(1)
      const row = rows[0] as PostRow | undefined
      if (!row) return null
      const tags = (await loadTags([row.id])).get(row.id) ?? []
      return { row, tags }
    },

    /** 详情页上下篇：older 是上一篇（更早），newer 是下一篇 */
    async neighbours(row: PostRow): Promise<{ prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null }> {
      if (row.publishedAt === null) return { prev: null, next: null }
      const publishedAt = row.publishedAt
      const [older, newer] = await Promise.all([
        db
          .select({ slug: s.posts.slug, title: s.posts.title })
          .from(s.posts)
          .where(
            and(
              listed(s),
              or(lt(s.posts.publishedAt, publishedAt), and(eq(s.posts.publishedAt, publishedAt), lt(s.posts.id, row.id))),
            ),
          )
          .orderBy(desc(s.posts.publishedAt), desc(s.posts.id))
          .limit(1),
        db
          .select({ slug: s.posts.slug, title: s.posts.title })
          .from(s.posts)
          .where(
            and(
              listed(s),
              or(gt(s.posts.publishedAt, publishedAt), and(eq(s.posts.publishedAt, publishedAt), gt(s.posts.id, row.id))),
            ),
          )
          .orderBy(asc(s.posts.publishedAt), asc(s.posts.id))
          .limit(1),
      ])
      return { prev: older[0] ?? null, next: newer[0] ?? null }
    },

    /** 相关文章：同分类优先，不足则用最新补足，排除自身 */
    async related(row: PostRow, limit: number): Promise<{ rows: PostRow[]; tags: Map<number, TagRow[]> }> {
      const base = [listed(s), ne(s.posts.id, row.id)]
      if (row.categorySlug) base.push(eq(s.categories.slug, row.categorySlug))

      const sameCategory = await db
        .select(selection(s))
        .from(s.posts)
        .leftJoin(s.categories, eq(s.categories.id, s.posts.categoryId))
        .where(and(...base))
        .orderBy(desc(s.posts.publishedAt), desc(s.posts.id))
        .limit(limit)

      const rows = [...sameCategory] as PostRow[]
      if (rows.length < limit) {
        const exclude = [row.id, ...rows.map((r) => r.id)]
        const filler = await db
          .select(selection(s))
          .from(s.posts)
          .leftJoin(s.categories, eq(s.categories.id, s.posts.categoryId))
          .where(and(listed(s), exclude.length > 0 ? notInArray(s.posts.id, exclude) : undefined))
          .orderBy(desc(s.posts.publishedAt), desc(s.posts.id))
          .limit(limit - rows.length)
        rows.push(...(filler as PostRow[]))
      }

      return { rows, tags: await loadTags(rows.map((r) => r.id)) }
    },

    /** 归档用：一次取全部已发布文章，分组交给 service（不依赖引擎日期函数） */
    async allPublished(): Promise<{ rows: PostRow[]; tags: Map<number, TagRow[]> }> {
      const rows = (await db
        .select(selection(s))
        .from(s.posts)
        .leftJoin(s.categories, eq(s.categories.id, s.posts.categoryId))
        .where(listed(s))
        .orderBy(desc(s.posts.publishedAt), desc(s.posts.id))) as PostRow[]
      return { rows, tags: await loadTags(rows.map((r) => r.id)) }
    },

    async incrementView(slug: string): Promise<boolean> {
      const result = (await db
        .update(s.posts)
        .set({ viewCount: sql`${s.posts.viewCount} + 1` })
        .where(and(eq(s.posts.slug, slug), listed(s)))) as { changes?: number; rowCount?: number | null }
      return (result.changes ?? result.rowCount ?? 0) > 0
    },
  }
}

export type PostRepository = ReturnType<typeof createPostRepository>
