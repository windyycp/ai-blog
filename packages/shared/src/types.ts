import type { ErrorCode } from './constants'

/** 分页元信息，仅列表类接口返回 */
export interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PageMeta
}

export interface ApiFailure {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface TagRef {
  slug: string
  name: string
  /** 标签总览与筛选边栏需要，文章内嵌时省略 */
  count?: number
}

export interface CategoryRef {
  slug: string
  name: string
  count?: number
}

/** 列表页与卡片使用的最小文章结构 */
export interface PostSummary {
  slug: string
  title: string
  excerpt: string | null
  coverUrl: string | null
  /** ISO 8601，未发布为 null */
  publishedAt: string | null
  readingTime: number
  featured: boolean
  category: CategoryRef | null
  tags: TagRef[]
}

export interface PostRef {
  slug: string
  title: string
}

/** 详情页：正文原文交给前端渲染（见 DESIGN.md §8） */
export interface PostDetail extends PostSummary {
  contentMd: string
  updatedAt: string
  viewCount: number
  prev: PostRef | null
  next: PostRef | null
}

export interface ArchiveMonth {
  /** 01 ~ 12 */
  month: string
  count: number
  posts: PostSummary[]
}

export interface ArchiveYear {
  year: string
  count: number
  months: ArchiveMonth[]
}

export interface SiteMeta {
  title: string
  description: string
  author: string
  avatarUrl: string | null
  socials: Array<{ label: string; href: string }>
  /** Markdown 原文 */
  about: string
}

export interface SearchResult {
  items: PostSummary[]
  total: number
  /** 一期恒为 like，二期 PG 上可能为 fts */
  engine: 'like' | 'fts'
}

export interface HealthPayload {
  status: 'ok'
  driver: 'sqlite' | 'postgres'
  latencyMs: number
  capabilities: { fts: boolean }
}

/** 前端列表筛选参数，与 GET /posts 的 query 一一对应 */
export interface PostListQuery {
  page?: number
  pageSize?: number
  tag?: string
  category?: string
  q?: string
  featured?: boolean
}
