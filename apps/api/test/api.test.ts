import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { loadConfig } from '../src/config/env'
import { createDbPort } from '../src/db/connect'
import { queryContext, type SqliteDb } from '../src/db/port'

const DAY = 86_400_000
const dir = mkdtempSync(join(tmpdir(), 'ai-blog-api-'))
const dbPath = join(dir, 'test.db')

async function seedFixtures(): Promise<void> {
  const port = createDbPort({ driver: 'sqlite', path: dbPath })
  try {
    migrate(port.db as SqliteDb, { migrationsFolder: 'drizzle/sqlite' })
    const { db, s } = queryContext(port)
    const now = Date.now()

    await db.insert(s.categories).values({ slug: 'ai', name: 'AI', sortOrder: 1, createdAt: now })
    await db.insert(s.tags).values([
      { slug: 'llm', name: 'LLM', createdAt: now },
      { slug: 'rag', name: 'RAG', createdAt: now },
    ])

    const [category] = await db.select({ id: s.categories.id }).from(s.categories)
    const tagRows = await db.select({ id: s.tags.id, slug: s.tags.slug }).from(s.tags)

    const [published] = await db
      .insert(s.posts)
      .values({
        slug: 'hello-world',
        title: 'Hello World',
        excerpt: '第一篇',
        contentMd: '# 正文\n\n这是正文内容。',
        categoryId: category?.id ?? null,
        status: 'published',
        readingTime: 3,
        viewCount: 0,
        featured: true,
        publishedAt: now - DAY,
        createdAt: now - DAY,
        updatedAt: now - DAY,
      })
      .returning({ id: s.posts.id })

    await db.insert(s.posts).values({
      slug: 'draft-post',
      title: '草稿',
      contentMd: 'draft',
      status: 'draft',
      readingTime: 1,
      viewCount: 0,
      featured: false,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    })

    if (published) {
      await db.insert(s.postTags).values(
        tagRows.map((t) => ({ postId: published.id, tagId: t.id })),
      )
    }

    await db.insert(s.siteMeta).values([
      { key: 'title', value: '测试站' },
      { key: 'socials', value: JSON.stringify([{ label: 'GitHub', href: 'https://github.com' }]) },
    ])
  } finally {
    await port.close()
  }
}

let app: FastifyInstance

beforeAll(async () => {
  await seedFixtures()
  const config = loadConfig({
    NODE_ENV: 'test',
    DB_DRIVER: 'sqlite',
    SQLITE_PATH: dbPath,
    LOG_LEVEL: 'error',
  })
  app = await buildApp(config)
  await app.ready()
})

afterAll(async () => {
  await app.close()
  rmSync(dir, { recursive: true, force: true })
})

describe('GET /api/v1/health', () => {
  it('回显 driver 与 capabilities', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      success: true,
      data: { status: 'ok', driver: 'sqlite', capabilities: { fts: false } },
    })
  })
})

describe('GET /api/v1/posts', () => {
  it('只返回已发布文章，并带分页元信息', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/posts' })
    const body = res.json()
    expect(res.statusCode).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].slug).toBe('hello-world')
    expect(body.data[0].category).toEqual({ slug: 'ai', name: 'AI' })
    expect(body.data[0].tags).toHaveLength(2)
    expect(body.meta).toMatchObject({ page: 1, total: 1, totalPages: 1 })
  })

  it('按标签过滤', async () => {
    const hit = await app.inject({ method: 'GET', url: '/api/v1/posts?tag=llm' })
    expect(hit.json().data).toHaveLength(1)
    const miss = await app.inject({ method: 'GET', url: '/api/v1/posts?tag=not-exist' })
    expect(miss.json().data).toHaveLength(0)
  })

  it('关键词大小写不敏感', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/posts?q=HELLO' })
    expect(res.json().data).toHaveLength(1)
  })

  it('非法分页参数返回 400 与错误码', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/posts?page=0' })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
  })
})

describe('GET /api/v1/posts/:slug', () => {
  it('返回正文、上下篇与更新时间', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/posts/hello-world' })
    const body = res.json()
    expect(res.statusCode).toBe(200)
    expect(body.data.contentMd).toContain('这是正文内容')
    expect(body.data.prev).toBeNull()
    expect(body.data.next).toBeNull()
    expect(body.data.updatedAt).toMatch(/Z$/)
  })

  it('草稿不可见，返回 404 与 NOT_FOUND', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/posts/draft-post' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })

  it('slug 非法返回 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/posts/非法 slug' })
    expect(res.statusCode).toBe(400)
  })
})

describe('其他端点', () => {
  it('归档按年月分组', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/archive' })
    const years = res.json().data as Array<{ year: string; count: number }>
    expect(years).toHaveLength(1)
    expect(years[0]?.count).toBe(1)
  })

  it('标签与分类带计数', async () => {
    const tags = await app.inject({ method: 'GET', url: '/api/v1/tags' })
    expect(tags.json().data).toEqual(
      expect.arrayContaining([{ slug: 'llm', name: 'LLM', count: 1 }]),
    )
    const categories = await app.inject({ method: 'GET', url: '/api/v1/categories' })
    expect(categories.json().data[0]).toMatchObject({ slug: 'ai', count: 1 })
  })

  it('站点信息解析 socials JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/site/meta' })
    expect(res.json().data).toMatchObject({
      title: '测试站',
      socials: [{ label: 'GitHub', href: 'https://github.com' }],
    })
  })

  it('浏览量自增', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/posts/hello-world/view' })
    expect(res.statusCode).toBe(200)
    const detail = await app.inject({ method: 'GET', url: '/api/v1/posts/hello-world' })
    expect(detail.json().data.viewCount).toBe(1)
  })

  it('未定义路由返回 404 且响应体统一', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
  })
})
