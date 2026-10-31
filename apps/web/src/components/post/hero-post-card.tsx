import Image from 'next/image'
import Link from 'next/link'
import { formatDate, formatReadingTime } from '@/lib/format'
import type { PostSummary } from '@/types'
import { chipClassName } from './chip-style'
import { TagChips } from './tag-chips'

/** 首页头条：整块留白更大、标题更重，和下方紧凑列表形成明确层级 */
export function HeroPostCard({ post }: { post: PostSummary }) {
  const href = `/posts/${post.slug}`

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-surface/60">
      {post.coverUrl && (
        <div className="relative aspect-[16/8] w-full overflow-hidden">
          <Image
            src={post.coverUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 720px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}

      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted">
          <span className="rounded-full bg-accent-weak px-2.5 py-0.5 font-medium text-accent">头条</span>
          {post.category && (
            <Link href={`/categories/${post.category.slug}`} className={chipClassName('sm', 'solid')}>
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent/70" />
              {post.category.name}
            </Link>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{formatReadingTime(post.readingTime)}</span>
        </div>

        <h3 className="mt-4 text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-[2.25rem]">
          <Link href={href} className="transition-colors group-hover:text-accent">
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="mt-3 line-clamp-3 max-w-2xl text-base leading-relaxed text-muted">{post.excerpt}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link href={href} className="text-[0.9375rem] font-medium text-accent">
            阅读全文 →
          </Link>
          {post.tags.length > 0 && <TagChips tags={post.tags.slice(0, 3)} size="sm" />}
        </div>
      </div>
    </article>
  )
}
