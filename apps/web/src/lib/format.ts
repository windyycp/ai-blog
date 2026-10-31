const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
})

const monthFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', timeZone: 'UTC' })

/** 统一按 UTC 展示，避免服务端与客户端时区不同导致 hydration 不一致 */
export function formatDate(iso: string | null): string {
  if (!iso) return '未发布'
  return dateFormatter.format(new Date(iso)).replaceAll('/', '-')
}

export function formatMonth(month: string): string {
  const index = Number(month) - 1
  if (Number.isNaN(index) || index < 0 || index > 11) return month
  return monthFormatter.format(new Date(Date.UTC(2024, index, 1)))
}

export function formatReadingTime(minutes: number): string {
  return `${Math.max(1, minutes)} 分钟`
}

export function formatCount(value: number): string {
  if (value < 1000) return String(value)
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
