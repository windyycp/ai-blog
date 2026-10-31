import type { Metadata } from 'next'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { PostList } from '@/components/post/post-list'
import { TagChips } from '@/components/post/tag-chips'
import { getPosts, getTags } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { PageMeta, PostSummary, TagRef } from '@/types'

export const revalidate = 300

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tags = await getTags().catch(() => [] as TagRef[])
  const name = tags.find((tag) => tag.slug === slug)?.name ?? slug
  return buildMetadata({
    title: `#${name}`,
    description: `所有带有 #${name} 标签的文章。`,
    path: `/tags/${slug}`,
  })
}

export default async function TagDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1

  let posts: PostSummary[] = []
  let meta: PageMeta = { page, pageSize: 10, total: 0, totalPages: 1 }
  let name = slug
  let siblings: TagRef[] = []

  try {
    const [list, tags] = await Promise.all([getPosts({ page, pageSize: 10, tag: slug }), getTags()])
    posts = list.items
    meta = list.meta
    siblings = tags.filter((tag) => tag.slug !== slug)
    name = tags.find((tag) => tag.slug === slug)?.name ?? slug
  } catch (error) {
    console.error('[tag] 数据加载失败：', (error as Error).message)
    throw error
  }

  return (
    <div className="pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">标签</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">#{name}</h1>
        <p className="mt-2 text-sm text-muted">共 {meta.total} 篇文章</p>
      </header>

      {posts.length === 0 ? (
        <EmptyState title="这个标签下还没有文章" description="去看看其他标签吧。" action={{ href: '/tags', label: '全部标签' }} />
      ) : (
        <>
          <PostList posts={posts} />
          <Pagination meta={meta} basePath={`/tags/${slug}`} />
        </>
      )}

      {siblings.length > 0 && (
        <section className="mt-14 border-t border-line pt-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">其他标签</h2>
          <TagChips tags={siblings.slice(0, 20)} size="sm" showCount />
        </section>
      )}
    </div>
  )
}
