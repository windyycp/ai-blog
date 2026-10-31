/**
 * 生产方言（PostgreSQL）。与 schema.sqlite.ts 结构必须一一对应，由 `db:parity` 保证。
 * 时间统一存 BIGINT Unix 毫秒。
 */
import { pgTable, bigint, integer, text, boolean, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core'

export const categories = pgTable(
  'categories',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('uq_categories_slug').on(t.slug)],
)

export const posts = pgTable(
  'posts',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    contentMd: text('content_md').notNull(),
    coverUrl: text('cover_url'),
    categoryId: bigint('category_id', { mode: 'number' }).references(() => categories.id),
    status: text('status').notNull().default('draft'),
    readingTime: integer('reading_time').notNull().default(0),
    viewCount: bigint('view_count', { mode: 'number' }).notNull().default(0),
    featured: boolean('featured').notNull().default(false),
    publishedAt: bigint('published_at', { mode: 'number' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('uq_posts_slug').on(t.slug),
    index('idx_posts_status_published').on(t.status, t.publishedAt),
    index('idx_posts_category').on(t.categoryId),
    index('idx_posts_published').on(t.publishedAt),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('uq_tags_slug').on(t.slug)],
)

export const postTags = pgTable(
  'post_tags',
  {
    postId: bigint('post_id', { mode: 'number' })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: bigint('tag_id', { mode: 'number' })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index('idx_post_tags_tag').on(t.tagId)],
)

/** value 存 JSON 字符串（与 SQLite 一致，便于 parity 与纯读场景） */
export const siteMeta = pgTable('site_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const postViews = pgTable(
  'post_views',
  {
    postId: bigint('post_id', { mode: 'number' })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    /** YYYY-MM-DD */
    date: text('date').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.postId, t.date] })],
)
