import type { SiteMeta } from '@ai-blog/shared'
import type { DbPort } from '../../db/port'
import { createSiteRepository } from './site.repository'

const DEFAULT_META: SiteMeta = {
  title: 'AI Blog',
  description: '记录 AI 与工程实践',
  author: '站长',
  avatarUrl: null,
  socials: [],
  about: '',
}

/** 采集系统写进来的 JSON 不可信，解析失败按空数组处理而不是整体报错 */
function parseSocials(raw: string | undefined): SiteMeta['socials'] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is { label: string; href: string } =>
        Boolean(item) && typeof item === 'object' && typeof (item as { label?: unknown }).label === 'string' && typeof (item as { href?: unknown }).href === 'string',
      )
      .slice(0, 8)
  } catch {
    return []
  }
}

export function createSiteService(port: DbPort) {
  const repo = createSiteRepository(port)

  return {
    async meta(): Promise<SiteMeta> {
      const kv = await repo.keyValues()
      return {
        title: kv.get('title') ?? DEFAULT_META.title,
        description: kv.get('description') ?? DEFAULT_META.description,
        author: kv.get('author') ?? DEFAULT_META.author,
        avatarUrl: kv.get('avatar_url') ?? null,
        socials: parseSocials(kv.get('socials')),
        about: kv.get('about') ?? DEFAULT_META.about,
      }
    },
  }
}
