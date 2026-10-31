import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/common/empty-state'
import { getTags } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { TagRef } from '@/types'

export const revalidate = 300

export const metadata: Metadata = buildMetadata({
  title: '标签',
  description: '按主题浏览全站文章标签。',
  path: '/tags',
})

export default async function TagsPage() {
  let tags: TagRef[] = []
  try {
    tags = await getTags()
  } catch (error) {
    console.error('[tags] 数据加载失败：', (error as Error).message)
    throw error
  }

  const max = Math.max(1, ...tags.map((tag) => tag.count ?? 1))

  return (
    <div className="pt-12 sm:pt-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">标签</h1>
        <p className="mt-2 text-sm text-muted">共 {tags.length} 个标签，字号越大文章越多。</p>
      </header>

      {tags.length === 0 ? (
        <EmptyState title="还没有标签" description="发布文章并打上标签后会出现在这里。" />
      ) : (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {tags.map((tag) => {
            const ratio = (tag.count ?? 1) / max
            const size = 1 + ratio * 1.2
            return (
              <li key={tag.slug}>
                <Link
                  href={`/tags/${tag.slug}`}
                  style={{ fontSize: `${size}rem` }}
                  className="inline-flex items-baseline gap-1 leading-none text-muted transition-colors hover:text-accent"
                >
                  #{tag.name}
                  <span className="text-[0.8125rem] opacity-60">{tag.count ?? 0}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
