import type { Metadata } from 'next'
import { EmptyState } from '@/components/common/empty-state'
import { SearchBox } from '@/components/common/search-box'
import { PostList } from '@/components/post/post-list'
import { searchPosts } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { SearchResult } from '@/types'

export const metadata: Metadata = buildMetadata({
  title: '搜索',
  description: '按关键词搜索全站文章。',
  path: '/search',
  // 搜索结果页不进索引
})

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const keyword = (q ?? '').trim()

  let result: SearchResult | null = null
  let failed = false

  if (keyword) {
    try {
      result = await searchPosts(keyword)
    } catch (error) {
      failed = true
      console.error('[search] 查询失败：', (error as Error).message)
    }
  }

  return (
    <div className="pt-12 sm:pt-16">
      <header className="mb-8 max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">搜索</h1>
        <p className="mt-2 text-sm text-muted">输入标题或正文中的关键词，回车开始搜索。</p>
        <div className="mt-5">
          <SearchBox variant="page" initialQuery={keyword} />
        </div>
      </header>

      {!keyword ? (
        <EmptyState title="等你输入关键词" description="例如：RAG、缓存、向量索引。" />
      ) : failed ? (
        <EmptyState title="搜索失败" description="内容服务暂时不可用，稍后再试。" />
      ) : result && result.items.length > 0 ? (
        <>
          <p className="mb-6 text-sm text-muted">
            找到 {result.total} 篇与「{keyword}」相关的文章
          </p>
          <PostList posts={result.items} />
        </>
      ) : (
        <EmptyState
          title={`没有找到「${keyword}」`}
          description="换个更短的关键词，或者浏览标签看看。"
          action={{ href: '/tags', label: '浏览标签' }}
        />
      )}
    </div>
  )
}
