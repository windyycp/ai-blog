import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SEARCH_PAGE_SIZE } from './constants'
import type { PageMeta } from './types'

const slug = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'slug 只能包含字母、数字与连字符')

const keyword = z.string().trim().min(1).max(64)

/** 注意：不能用 z.coerce.boolean()，"false" 会被转成 true */
const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export const listPostsQuerySchema = paginationSchema.extend({
  tag: slug.optional(),
  category: slug.optional(),
  q: keyword.optional(),
  featured: booleanFlag.optional(),
})

export const searchQuerySchema = z.object({
  q: keyword,
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(SEARCH_PAGE_SIZE),
})

export const slugParamSchema = z.object({ slug })

export const revalidatePayloadSchema = z
  .object({
    tags: z.array(z.string().min(1).max(128)).min(1).max(20).optional(),
    /** 页面级失效，用于整页缓存（full route cache）的场景 */
    paths: z.array(z.string().min(1).max(256)).min(1).max(20).optional(),
  })
  .refine((value) => Boolean(value.tags?.length || value.paths?.length), {
    message: 'tags 与 paths 至少提供一个',
  })

export type ListPostsQueryInput = z.input<typeof listPostsQuerySchema>
export type ListPostsQuery = z.output<typeof listPostsQuerySchema>
export type SearchQuery = z.output<typeof searchQuerySchema>

export function buildPageMeta(total: number, page: number, pageSize: number): PageMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
