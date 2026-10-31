import Link from 'next/link'
import { formatDate, formatReadingTime } from '@/lib/format'
import type { PostDetail } from '@/types'
import { CategoryChips } from './category-chips'
import { TagChips } from './tag-chips'

/** 桌面端右栏：纵向列出时间、阅读量、分类与标签 */
export function PostMetaAside({ post }: { post: PostDetail }) {
  const updated = post.updatedAt !== post.publishedAt

  return (
    <dl className="space-y-4 border-b border-line pb-6 text-[0.8125rem] lg:border-b-0 lg:pb-0">
      <div>
        <dt className="text-muted">发布于</dt>
        <dd className="mt-0.5">
          <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
        </dd>
      </div>

      {updated && (
        <div>
          <dt className="text-muted">更新于</dt>
          <dd className="mt-0.5">{formatDate(post.updatedAt)}</dd>
        </div>
      )}

      <div>
        <dt className="text-muted">阅读</dt>
        <dd className="mt-0.5">
          {formatReadingTime(post.readingTime)} · {post.viewCount} 次
        </dd>
      </div>

      {post.category && (
        <div>
          <dt className="text-muted">分类</dt>
          <dd className="mt-1.5">
            <CategoryChips categories={[post.category]} size="sm" />
          </dd>
        </div>
      )}

      {post.tags.length > 0 && (
        <div>
          <dt className="text-muted">标签</dt>
          <dd className="mt-1.5">
            <TagChips tags={post.tags} size="sm" />
          </dd>
        </div>
      )}
    </dl>
  )
}

/** 移动端：压在标题下方的一行元信息，避免右栏信息在小屏丢失 */
export function PostMetaInline({ post }: { post: PostDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted lg:hidden">
      <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{formatReadingTime(post.readingTime)}</span>
      <span aria-hidden="true">·</span>
      <span>{post.viewCount} 次阅读</span>
      {post.category && (
        <>
          <span aria-hidden="true">·</span>
          <Link href={`/categories/${post.category.slug}`} className="transition-colors hover:text-fg">
            {post.category.name}
          </Link>
        </>
      )}
      {post.tags.length > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span className="truncate">{post.tags.map((tag) => `#${tag.name}`).join(' ')}</span>
        </>
      )}
    </div>
  )
}
