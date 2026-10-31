import type { MetadataRoute } from 'next'
import { MAX_PAGE_SIZE } from '@ai-blog/shared'
import { getCategories, getPosts, getTags } from '@/lib/api'
import { SITE_URL, absoluteUrl } from '@/lib/seo'
import type { PostSummary } from '@/types'

export const revalidate = 3600

async function allPosts(): Promise<PostSummary[]> {
  const collected: PostSummary[] = []
  for (let page = 1; page <= 20; page += 1) {
    const { items, meta } = await getPosts({ page, pageSize: MAX_PAGE_SIZE })
    collected.push(...items)
    if (page >= meta.totalPages) break
  }
  return collected
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/posts'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/archive'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/tags'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/about'), changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const [posts, tags, categories] = await Promise.all([allPosts(), getTags(), getCategories()])

    return [
      ...staticRoutes,
      ...posts.map((post) => ({
        url: absoluteUrl(`/posts/${post.slug}`),
        lastModified: post.publishedAt ? new Date(post.publishedAt) : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
      ...tags.map((tag) => ({
        url: absoluteUrl(`/tags/${tag.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
      ...categories.map((category) => ({
        url: absoluteUrl(`/categories/${category.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
    ]
  } catch (error) {
    console.error('[sitemap] 动态部分生成失败，仅输出静态路由：', (error as Error).message)
    return staticRoutes
  }
}
