import Image from 'next/image'
import Link from 'next/link'
import { cn, formatDate, formatReadingTime } from '@/lib/format'
import type { PostSummary } from '@/types'
import { TagChips } from './tag-chips'

interface PostCardProps {
  post: PostSummary
  /** 首页头条：图更大、标题更大 */
  featured?: boolean
  priority?: boolean
}

export function PostCard({ post, featured = false, priority = false }: PostCardProps) {
  return (
    <article
      className={cn(
        'group relative',
        !featured && 'border-b border-line pb-7 last:border-b-0',
      )}
    >
      <Link href={`/posts/${post.slug}`} className="block focus-visible:outline-none">
        {post.coverUrl && (
          <div
            className={cn(
              'relative mb-4 overflow-hidden rounded-lg border border-line bg-surface',
              featured ? 'aspect-[16/9]' : 'aspect-[16/6]',
            )}
          >
            <Image
              src={post.coverUrl}
              alt=""
              fill
              priority={priority}
              sizes={featured ? '(max-width: 768px) 100vw, 768px' : '(max-width: 768px) 100vw, 640px'}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted">
          {post.category && (
            <span className="rounded bg-surface px-1.5 py-0.5 text-fg/80">{post.category.name}</span>
          )}
          <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{formatReadingTime(post.readingTime)}</span>
          {post.featured && <span className="text-accent">精选</span>}
        </div>

        <h2
          className={cn(
            'mt-2 font-semibold leading-snug tracking-tight transition-colors group-hover:text-accent',
            featured ? 'text-2xl sm:text-[2rem]' : 'text-xl',
          )}
        >
          {post.title}
        </h2>

        {post.excerpt && (
          <p
            className={cn('mt-2 text-[0.9375rem] leading-relaxed text-muted', featured ? 'line-clamp-3' : 'line-clamp-2')}
          >
            {post.excerpt}
          </p>
        )}
      </Link>

      {post.tags.length > 0 && (
        <div className="mt-3">
          <TagChips tags={post.tags} size="sm" />
        </div>
      )}
    </article>
  )
}
