/**
 * 本地 / 测试方言（SQLite）。与 schema.pg.ts 结构必须一一对应，由 `db:parity` 保证。
 * 时间统一存 Unix 毫秒整数（见 ARCHITECTURE.md §5.2）。
 */
import { sqliteTable, integer, text, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('uq_categories_slug').on(t.slug)],
)

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    contentMd: text('content_md').notNull(),
    coverUrl: text('cover_url'),
    categoryId: integer('category_id').references(() => categories.id),
    status: text('status').notNull().default('draft'),
    readingTime: integer('reading_time').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('uq_posts_slug').on(t.slug),
    index('idx_posts_status_published').on(t.status, t.publishedAt),
    index('idx_posts_category').on(t.categoryId),
    index('idx_posts_published').on(t.publishedAt),
  ],
)

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('uq_tags_slug').on(t.slug)],
)

export const postTags = sqliteTable(
  'post_tags',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index('idx_post_tags_tag').on(t.tagId)],
)

/** value 存 JSON 字符串；不进入 value 内部查询，故两方言统一用 TEXT（见 ARCHITECTURE.md §6.1 注） */
export const siteMeta = sqliteTable('site_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const postViews = sqliteTable(
  'post_views',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.postId, t.date] })],
)
