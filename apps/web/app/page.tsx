import Link from 'next/link'
import type { Metadata } from 'next'
import { EmptyState } from '@/components/common/empty-state'
import { CategoryChips } from '@/components/post/category-chips'
import { CompactPostCard } from '@/components/post/compact-post-card'
import { HeroPostCard } from '@/components/post/hero-post-card'
import { TagChips } from '@/components/post/tag-chips'
import { getCategories, getPosts, getSiteMeta, getTags } from '@/lib/api'
import { websiteJsonLd } from '@/lib/seo'
import type { CategoryRef, PostSummary, TagRef } from '@/types'

export const revalidate = 60

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
}

export default async function HomePage() {
  let posts: PostSummary[] = []
  let categories: CategoryRef[] = []
  let tags: TagRef[] = []
  let site = null as Awaited<ReturnType<typeof getSiteMeta>> | null

  try {
    const [list, cats, tagList, meta] = await Promise.all([
      getPosts({ pageSize: 7 }),
      getCategories(),
      getTags(),
      getSiteMeta(),
    ])
    posts = list.items
    categories = cats
    tags = tagList.slice(0, 10)
    site = meta
  } catch (error) {
    // 抛给 error.tsx：服务不可用不该被 ISR 缓存成一页空白
    console.error('[home] 数据加载失败：', (error as Error).message)
    throw error
  }

  const [lead, ...rest] = posts

  return (
    <>
      {site && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteJsonLd(site) }} />
      )}

      <div className="grid gap-12 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section aria-labelledby="latest-posts">
          <div className="mb-6 flex items-baseline justify-between">
            <h1 id="latest-posts" className="text-xl font-semibold tracking-tight sm:text-2xl">
              最新文章
            </h1>
            <Link href="/posts" className="text-sm text-muted transition-colors hover:text-fg">
              全部 →
            </Link>
          </div>

          {posts.length === 0 ? (
            <EmptyState
              title="暂时没有文章"
              description="内容服务可能尚未启动，或者还没有已发布的文章。"
              action={{ href: '/posts', label: '刷新看看' }}
            />
          ) : (
            <div className="mt-6 space-y-4">
              {lead && <HeroPostCard post={lead} />}
              {rest.length > 0 && (
                <ul className="space-y-3">
                  {rest.map((post) => (
                    <li key={post.slug}>
                      <CompactPostCard post={post} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          {categories.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">分类</h2>
              <CategoryChips categories={categories} size="sm" showCount />
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">标签</h2>
              <TagChips tags={tags} size="sm" />
            </div>
          )}

          <div className="text-xs leading-relaxed text-muted">
            <p>本站内容以 Markdown 存储，前端服务端渲染，支持暗色模式与全文检索。</p>
          </div>
        </aside>
      </div>
    </>
  )
}
