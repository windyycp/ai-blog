import type { Metadata } from 'next'
import type { PostDetail, SiteMeta } from '@/types'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}

interface MetadataInput {
  title: string
  description: string
  path: string
  site?: SiteMeta
  type?: 'website' | 'article'
  publishedTime?: string | null
  modifiedTime?: string
  tags?: string[]
}

export function buildMetadata(input: MetadataInput): Metadata {
  const siteName = input.site?.title ?? 'AI Blog'
  const url = absoluteUrl(input.path)
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName,
      type: input.type ?? 'website',
      locale: 'zh_CN',
      publishedTime: input.publishedTime ?? undefined,
      modifiedTime: input.modifiedTime,
      tags: input.tags,
    },
    twitter: { card: 'summary_large_image', title: input.title, description: input.description },
  }
}

export function blogPostingJsonLd(post: PostDetail, site: SiteMeta): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: site.author },
    image: post.coverUrl ? [post.coverUrl] : undefined,
    keywords: post.tags.map((t) => t.name).join(','),
    mainEntityOfPage: absoluteUrl(`/posts/${post.slug}`),
  })
}

export function websiteJsonLd(site: SiteMeta): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.title,
    description: site.description,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl('/search')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  })
}
