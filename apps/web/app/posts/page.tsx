import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { CategoryChips } from '@/components/post/category-chips'
import { PostList } from '@/components/post/post-list'
import { TagChips } from '@/components/post/tag-chips'
import { getCategories, getPosts, getTags } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { CategoryRef, PageMeta, PostSummary, TagRef } from '@/types'

export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ page?: string; tag?: string; category?: string; q?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { tag, category } = await searchParams
  const title = tag ? `标签：${tag}` : category ? `分类：${category}` : '全部文章'
  return buildMetadata({
    title,
    description: '按时间倒序排列的全部已发布文章，可按标签、分类与关键词筛选。',
    path: '/posts',
  })
}

export default async function PostsPage({ searchParams }: PageProps) {
  const { page: pageParam, tag, category, q } = await searchParams
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1

  let posts: PostSummary[] = []
  let meta: PageMeta = { page, pageSize: 10, total: 0, totalPages: 1 }
  let tags: TagRef[] = []
  let categories: CategoryRef[] = []

  try {
    const [list, tagList, catList] = await Promise.all([
      getPosts({ page, pageSize: 10, tag, category, q }),
      getTags(),
      getCategories(),
    ])
    posts = list.items
    meta = list.meta
    tags = tagList
    categories = catList
  } catch (error) {
    console.error('[posts] 数据加载失败：', (error as Error).message)
    throw error
  }

  const heading = tag ? `#${tag}` : category ? category : q ? `搜索“${q}”` : '全部文章'
  const filterParams = { tag, category, q }

  return (
    <div className="pt-12 sm:pt-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-2 text-sm text-muted">
          {meta.total > 0 ? `共 ${meta.total} 篇` : '按发布时间倒序'}
          {(tag || category || q) && (
            <>
              {' · '}
              <Link href="/posts" className="text-accent hover:underline">
                清除筛选
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section>
          {posts.length === 0 ? (
            <EmptyState
              title="没有匹配的文章"
              description="换个关键词或清除筛选条件试试。"
              action={{ href: '/posts', label: '查看全部文章' }}
            />
          ) : (
            <>
              <PostList posts={posts} />
              <Pagination meta={meta} basePath="/posts" params={filterParams} />
            </>
          )}
        </section>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          {categories.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">分类</h2>
              <CategoryChips categories={categories} size="sm" showCount activeSlug={category} />
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">标签</h2>
              <TagChips tags={tags} size="sm" activeSlug={tag} />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
