import { cn } from '@/lib/format'

export type ChipSize = 'sm' | 'md'
export type ChipTone = 'outline' | 'solid' | 'active'

/** 分类与标签共用同一套胶囊外观，只在色调上区分：标签描边、分类浅底、选中态浅底强调色 */
export function chipClassName(size: ChipSize = 'md', tone: ChipTone = 'outline', className?: string): string {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full border transition-colors',
    tone === 'active'
      ? 'border-accent/40 bg-accent-weak text-accent'
      : tone === 'solid'
        ? 'border-line bg-surface text-fg hover:border-accent/40 hover:text-accent'
        : 'border-line text-muted hover:border-accent/40 hover:text-accent',
    size === 'sm' ? 'px-2.5 py-1 text-[0.8125rem]' : 'px-3 py-1.5 text-sm',
    className,
  )
}
