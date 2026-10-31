import Link from 'next/link'
import { formatDate, formatReadingTime } from '@/lib/format'
import type { PostSummary } from '@/types'
import { chipClassName } from './chip-style'

/** 首页次级条目：一行一条，信息密度优先 */
export function CompactPostCard({ post }: { post: PostSummary }) {
  return (
    <article className="group rounded-xl border border-line bg-surface/40 p-4 transition-colors hover:border-accent/40 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted">
            {post.category && (
              <Link href={`/categories/${post.category.slug}`} className={chipClassName('sm', 'solid')}>
                {post.category.name}
              </Link>
            )}
            <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
          </div>

          <h3 className="mt-1.5 text-[1.0625rem] font-medium leading-snug tracking-tight sm:text-lg">
            <Link href={`/posts/${post.slug}`} className="transition-colors group-hover:text-accent">
              {post.title}
            </Link>
          </h3>

          {post.excerpt && (
            <p className="mt-1.5 line-clamp-1 text-[0.9375rem] leading-relaxed text-muted">{post.excerpt}</p>
          )}
        </div>

        <span className="shrink-0 pt-0.5 text-[0.8125rem] text-muted/70">{formatReadingTime(post.readingTime)}</span>
      </div>
    </article>
  )
}
