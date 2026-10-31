export type {
  ArchiveMonth,
  ArchiveYear,
  CategoryRef,
  PageMeta,
  PostDetail,
  PostListQuery,
  PostRef,
  PostSummary,
  SearchResult,
  SiteMeta,
  TagRef,
} from '@ai-blog/shared'

/** 目录项，只取 H2/H3 */
export interface TocItem {
  id: string
  text: string
  depth: 2 | 3
}
