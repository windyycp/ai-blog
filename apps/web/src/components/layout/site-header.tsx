import Link from 'next/link'
import { SearchBox } from '@/components/common/search-box'
import { MobileMenu } from './mobile-menu'
import { NavLinks, type NavItem } from './nav-links'
import { ThemeToggle } from './theme-toggle'

export const NAV_ITEMS: NavItem[] = [
  { href: '/posts', label: '文章' },
  { href: '/tags', label: '标签' },
  { href: '/archive', label: '归档' },
  { href: '/about', label: '关于' },
]

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="page-container flex h-16 items-center gap-3">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight">
          {title}
        </Link>
        <nav aria-label="主导航" className="ml-3 hidden md:block">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SearchBox variant="header" className="hidden w-44 sm:block" />
          <ThemeToggle />
          <MobileMenu items={NAV_ITEMS} />
        </div>
      </div>
    </header>
  )
}
