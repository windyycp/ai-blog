export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 50
export const SEARCH_PAGE_SIZE = 20

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** 前端 revalidateTag 与后端失效通知共用的标签名 */
export const CACHE_TAGS = {
  list: 'list',
  archive: 'archive',
  site: 'site',
  post: (slug: string) => `post:${slug}`,
  tag: (slug: string) => `tag:${slug}`,
  category: (slug: string) => `category:${slug}`,
} as const

export const POST_STATUS = {
  draft: 'draft',
  published: 'published',
  archived: 'archived',
} as const
