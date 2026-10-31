import { cache } from 'react'
import type {
  ArchiveYear,
  ApiResponse,
  CategoryRef,
  PageMeta,
  PostDetail,
  PostListQuery,
  PostSummary,
  SearchResult,
  SiteMeta,
  TagRef,
} from '@ai-blog/shared'
import { CACHE_TAGS, SEARCH_PAGE_SIZE } from '@ai-blog/shared'

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }

  get isNotFound(): boolean {
    return this.status === 404
  }
}

interface RequestOptions {
  revalidate: number
  tags?: string[]
}

async function request<T>(path: string, options: RequestOptions): Promise<{ data: T; meta?: PageMeta }> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: options.revalidate, tags: options.tags },
    })
  } catch (error) {
    throw new ApiError(503, `无法连接内容服务：${(error as Error).message}`)
  }

  let body: ApiResponse<T>
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    throw new ApiError(response.status, '内容服务返回了非 JSON 响应')
  }

  if (!response.ok || !body.success) {
    const failure = body as Extract<ApiResponse<T>, { success: false }>
    throw new ApiError(response.status, failure.error?.message ?? '请求失败', failure.error?.code)
  }

  return { data: body.data, meta: body.meta }
}

function buildQuery(entries: Array<[string, string | number | boolean | undefined]>): string {
  const params = new URLSearchParams()
  for (const [key, value] of entries) {
    if (value === undefined || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** React cache：同一次请求内多个组件取同一份数据只发一次请求 */
export const getSiteMeta = cache(async (): Promise<SiteMeta> => {
  const { data } = await request<SiteMeta>('/site/meta', { revalidate: 600, tags: [CACHE_TAGS.site] })
  return data
})

export const getPosts = cache(
  async (query: PostListQuery = {}): Promise<{ items: PostSummary[]; meta: PageMeta }> => {
    const search = buildQuery([
      ['page', query.page],
      ['pageSize', query.pageSize],
      ['tag', query.tag],
      ['category', query.category],
      ['q', query.q],
      ['featured', query.featured],
    ])
    const tags: string[] = [CACHE_TAGS.list]
    if (query.tag) tags.push(CACHE_TAGS.tag(query.tag))
    if (query.category) tags.push(CACHE_TAGS.category(query.category))

    const { data, meta } = await request<PostSummary[]>(`/posts${search}`, { revalidate: 60, tags })
    return { items: data, meta: meta ?? { page: 1, pageSize: data.length, total: data.length, totalPages: 1 } }
  },
)

export const getPost = cache(async (slug: string): Promise<PostDetail> => {
  const { data } = await request<PostDetail>(`/posts/${slug}`, {
    revalidate: 300,
    tags: [CACHE_TAGS.post(slug), CACHE_TAGS.list],
  })
  return data
})

export const getRelatedPosts = cache(async (slug: string): Promise<PostSummary[]> => {
  const { data } = await request<PostSummary[]>(`/posts/${slug}/related`, {
    revalidate: 300,
    tags: [CACHE_TAGS.list],
  })
  return data
})

export const getTags = cache(async (): Promise<TagRef[]> => {
  const { data } = await request<TagRef[]>('/tags', { revalidate: 300, tags: [CACHE_TAGS.list] })
  return data
})

export const getCategories = cache(async (): Promise<CategoryRef[]> => {
  const { data } = await request<CategoryRef[]>('/categories', { revalidate: 300, tags: [CACHE_TAGS.list] })
  return data
})

export const getArchive = cache(async (): Promise<ArchiveYear[]> => {
  const { data } = await request<ArchiveYear[]>('/archive', { revalidate: 300, tags: [CACHE_TAGS.archive] })
  return data
})

export async function searchPosts(keyword: string, limit = SEARCH_PAGE_SIZE): Promise<SearchResult> {
  const search = buildQuery([
    ['q', keyword],
    ['limit', limit],
  ])
  const { data } = await request<SearchResult>(`/search${search}`, { revalidate: 0 })
  return data
}
