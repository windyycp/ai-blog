import type { Metadata } from 'next'
import Image from 'next/image'
import { getSiteMeta } from '@/lib/api'
import { renderMarkdown } from '@/lib/markdown'
import { buildMetadata } from '@/lib/seo'
import type { SiteMeta } from '@/types'

export const revalidate = 600

export const metadata: Metadata = buildMetadata({
  title: '关于',
  description: '关于这个博客与作者。',
  path: '/about',
})

export default async function AboutPage() {
  let site: SiteMeta | null = null
  try {
    site = await getSiteMeta()
  } catch (error) {
    console.error('[about] 数据加载失败：', (error as Error).message)
  }

  const about = site?.about?.trim() ? await renderMarkdown(site.about) : null

  return (
    <div className="pt-12 sm:pt-16">
      <header className="flex items-center gap-4">
        {site?.avatarUrl ? (
          <Image
            src={site.avatarUrl}
            alt={site.author}
            width={64}
            height={64}
            className="size-16 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="grid size-16 place-items-center rounded-full border border-line bg-surface text-lg font-medium text-muted">
            {(site?.author ?? 'A').slice(0, 1)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{site?.author ?? '站长'}</h1>
          <p className="mt-1 text-sm text-muted">{site?.description ?? '写点关于 AI 与工程的东西。'}</p>
        </div>
      </header>

      {site && site.socials.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2 text-sm">
          {site.socials.map((social) => (
            <li key={social.href}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-3 py-1 text-muted transition-colors hover:text-fg"
              >
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 max-w-2xl">
        {about ? (
          <div className="prose">{about.content}</div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            还没有填写介绍。可以在站点配置里补充 about 内容，它同样以 Markdown 存储。
          </p>
        )}
      </div>
    </div>
  )
}
