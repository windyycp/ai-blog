import type { CategoryRef, PostDetail, PostRef, PostSummary, TagRef } from '@ai-blog/shared'
import type { PostRow, TagRow } from './post.repository'

const toIso = (ms: number | null): string | null => (ms === null ? null : new Date(ms).toISOString())

/** 中文按 400 字/分钟估算，与前端展示口径一致 */
export function estimateReadingTime(contentMd: string): number {
  const chars = contentMd.replace(/\s+/g, '').length
  return Math.max(1, Math.round(chars / 400))
}

/** 去掉 Markdown 标记后截断，作为 excerpt 的兜底 */
export function deriveExcerpt(contentMd: string, max = 120): string {
  const plain = contentMd
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

function toCategory(row: PostRow): CategoryRef | null {
  if (!row.categorySlug || !row.categoryName) return null
  return { slug: row.categorySlug, name: row.categoryName }
}

function toTagRefs(tags: TagRow[]): TagRef[] {
  return tags.map((t) => ({ slug: t.slug, name: t.name }))
}

export function toSummary(row: PostRow, tags: TagRow[] = []): PostSummary {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt?.trim() || deriveExcerpt(row.contentMd),
    coverUrl: row.coverUrl,
    publishedAt: toIso(row.publishedAt),
    readingTime: row.readingTime > 0 ? row.readingTime : estimateReadingTime(row.contentMd),
    featured: Boolean(row.featured),
    category: toCategory(row),
    tags: toTagRefs(tags),
  }
}

export function toDetail(
  row: PostRow,
  tags: TagRow[],
  prev: PostRef | null,
  next: PostRef | null,
): PostDetail {
  return {
    ...toSummary(row, tags),
    contentMd: row.contentMd,
    updatedAt: new Date(row.updatedAt).toISOString(),
    viewCount: row.viewCount,
    prev,
    next,
  }
}
