import { getSiteMeta, getPosts } from '@/lib/api'
import { absoluteUrl } from '@/lib/seo'

export const revalidate = 3600

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export async function GET() {
  const site = await getSiteMeta().catch(() => null)

  let items = ''
  try {
    const { items: posts } = await getPosts({ pageSize: 20 })
    items = posts
      .map((post) => {
        const url = absoluteUrl(`/posts/${post.slug}`)
        const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date().toUTCString()
        return [
          '<item>',
          `<title>${escapeXml(post.title)}</title>`,
          `<link>${url}</link>`,
          `<guid isPermaLink="true">${url}</guid>`,
          `<pubDate>${pubDate}</pubDate>`,
          post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : '',
          post.category ? `<category>${escapeXml(post.category.name)}</category>` : '',
          post.tags.map((tag) => `<category>${escapeXml(tag.name)}</category>`).join(''),
          '</item>',
        ].join('')
      })
      .join('')
  } catch (error) {
    console.error('[feed] 生成失败，仅输出空 feed：', (error as Error).message)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site?.title ?? 'AI Blog')}</title>
    <link>${absoluteUrl('/')}</link>
    <description>${escapeXml(site?.description ?? '')}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
