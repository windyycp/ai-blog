import Link from 'next/link'
import type { SiteMeta } from '@/types'
import { NAV_ITEMS } from './site-header'

export function SiteFooter({ site }: { site: SiteMeta }) {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="page-container flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium">{site.title}</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted">{site.description}</p>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} {site.author}
          </p>
        </div>

        <div className="flex gap-10 text-sm">
          <nav aria-label="页脚导航" className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">导航</p>
            <ul className="space-y-1.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted transition-colors hover:text-fg">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="/feed.xml" className="text-muted transition-colors hover:text-fg">
                  RSS
                </a>
              </li>
            </ul>
          </nav>

          {site.socials.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">联系</p>
              <ul className="space-y-1.5">
                {site.socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted transition-colors hover:text-fg"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
