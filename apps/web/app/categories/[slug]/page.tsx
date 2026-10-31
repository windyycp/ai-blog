import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { PostList } from '@/components/post/post-list'
import { getCategories, getPosts } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { CategoryRef, PageMeta, PostSummary } from '@/types'

export const revalidate = 300

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const categories = await getCategories().catch(() => [] as CategoryRef[])
  const name = categories.find((item) => item.slug === slug)?.name ?? slug
  return buildMetadata({
    title: `分类：${name}`,
    description: `「${name}」分类下的全部文章。`,
    path: `/categories/${slug}`,
  })
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1

  let posts: PostSummary[] = []
  let meta: PageMeta = { page, pageSize: 10, total: 0, totalPages: 1 }
  let categories: CategoryRef[] = []
  let name = slug

  try {
    const [list, catList] = await Promise.all([getPosts({ page, pageSize: 10, category: slug }), getCategories()])
    posts = list.items
    meta = list.meta
    categories = catList
    name = catList.find((item) => item.slug === slug)?.name ?? slug
  } catch (error) {
    console.error('[category] 数据加载失败：', (error as Error).message)
    throw error
  }

  return (
    <div className="pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">分类</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
        <p className="mt-2 text-sm text-muted">共 {meta.total} 篇文章</p>
      </header>

      {posts.length === 0 ? (
        <EmptyState title="这个分类下还没有文章" action={{ href: '/posts', label: '查看全部文章' }} />
      ) : (
        <>
          <PostList posts={posts} />
          <Pagination meta={meta} basePath={`/categories/${slug}`} />
        </>
      )}

      {categories.length > 1 && (
        <nav aria-label="其他分类" className="mt-14 flex flex-wrap gap-2 border-t border-line pt-6 text-sm">
          {categories
            .filter((item) => item.slug !== slug)
            .map((item) => (
              <Link
                key={item.slug}
                href={`/categories/${item.slug}`}
                className="rounded-full border border-line px-3 py-1 text-muted transition-colors hover:text-fg"
              >
                {item.name}
                <span className="ml-1 text-xs opacity-60">{item.count ?? 0}</span>
              </Link>
            ))}
        </nav>
      )}
    </div>
  )
}
