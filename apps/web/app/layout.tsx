import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BackToTop } from '@/components/common/back-to-top'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { getSiteMeta } from '@/lib/api'
import { SITE_URL } from '@/lib/seo'
import type { SiteMeta } from '@/types'

export const FALLBACK_SITE: SiteMeta = {
  title: 'AI Blog',
  description: '记录 AI 工程实践、检索增强与前端架构的笔记。',
  author: '站长',
  avatarUrl: null,
  socials: [],
  about: '',
}

/**
 * api 未启动时也要能渲染骨架：布局层降级，页面层各自决定是显示错误页还是空状态。
 */
async function loadSite(): Promise<SiteMeta> {
  try {
    return await getSiteMeta()
  } catch (error) {
    console.warn('[web] 读取站点信息失败，使用内置默认值：', (error as Error).message)
    return FALLBACK_SITE
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite()
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.title, template: `%s · ${site.title}` },
    description: site.description,
    authors: [{ name: site.author }],
    applicationName: site.title,
    alternates: {
      canonical: '/',
      types: { 'application/rss+xml': '/feed.xml' },
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName: site.title,
      title: site.title,
      description: site.description,
      url: SITE_URL,
    },
    twitter: { card: 'summary_large_image', title: site.title, description: site.description },
    robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
  ],
}

/** 首屏前同步解析主题，避免深色模式白闪 */
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var m=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=m;document.documentElement.style.colorScheme=m}catch(e){}})();`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await loadSite()

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-line focus:bg-bg focus:px-3 focus:py-2 focus:text-sm"
        >
          跳到正文
        </a>
        <SiteHeader title={site.title} />
        <main id="main" className="page-container">
          {children}
        </main>
        <SiteFooter site={site} />
        <BackToTop />
      </body>
    </html>
  )
}
