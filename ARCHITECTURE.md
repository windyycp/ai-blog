# AI Blog 系统架构说明

> 版本 v2.0（一期）· 2026-10-31
> 定位：个人博客系统，前后端分离，模块化、分层清晰、易维护。
>
> **本文只描述系统架构**：选型、边界、分层、数据契约、部署、测试。
> 页面设计、交互与响应式、DTO 字段定义、Markdown 渲染管线、组件拆分等内容**另文讨论**，本文不涉及。

## 目录

1. [技术选型与边界](#1-技术选型与边界)
2. [系统总览](#2-系统总览)
3. [仓库结构](#3-仓库结构)
4. [后端架构](#4-后端架构)
5. [数据访问层与双引擎](#5-数据访问层与双引擎)
6. [数据模型与写入契约](#6-数据模型与写入契约)
7. [API 契约](#7-api-契约)
8. [配置与部署](#8-配置与部署)
9. [测试与演进](#9-测试与演进)

---

## 1. 技术选型与边界

### 1.1 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | **Next.js 15（App Router）+ React 19** | 原需求「Nuxt.js + React」框架冲突，经确认保留 React |
| 样式 | **Tailwind CSS v4** | 原子化 + CSS 变量设计令牌 |
| 后端 | **Fastify 5** | 高性能、插件化、Schema 校验与序列化 |
| ORM | **Drizzle ORM（双 dialect）** | 类型安全、贴近 SQL；官方同时支持 SQLite 与 PG |
| 数据库 | **PostgreSQL 14+（生产）/ SQLite（本地与测试）** | 线上只有 PG 一种形态 |
| 语言 | **TypeScript strict** | 前后端共享类型 |
| 工程 | **pnpm workspace** | Monorepo，版本由 `packageManager` 锁定 |
| 校验 | **Zod + fastify-type-provider-zod** | 入参校验与 OpenAPI 同源 |
| 渲染 | **remark / rehype + Shiki** | Markdown 服务端渲染，零客户端 JS |
| 日志 | **Pino**（Fastify 内置） | 结构化 + request-id |

### 1.2 数据库定位

| | PostgreSQL 14+ | SQLite |
| --- | --- | --- |
| 角色 | **生产唯一数据库** | 本地开发 / 单测 / CI 的临时替身 |
| 存在理由 | 并发、可靠性、可扩容、可远程访问 | 零依赖零启动，删文件即重置 |
| 并发要求 | MVCC、连接池、多实例 | **无**（单进程读写） |
| 调优 | 连接池、索引、`EXPLAIN`、只读账号 | **一律不做**：不设 WAL、不设 `busy_timeout`、不做读写分离 |
| 数据 | 全部真实数据 | 可随时丢弃的样例数据 |

保留双引擎只为一件事：本地与 CI 不必起容器就能跑完整链路。**它不是支持两种线上部署形态的承诺。**

### 1.3 边界

**一期范围**：内容由**外部采集系统直接写入 PostgreSQL**（本地开发连 SQLite），本站不提供任何写入接口与管理后台；前端通过后端 REST API 读取标题、正文、标签、分类、归档等数据。

**永不做**：后台内容管理、登录鉴权、文章编辑器。本系统保持**纯读服务**边界。

三个硬约束：

1. 数据库表结构即对外的「写入契约」，只能增量演进。
2. 内容更新后需通过探测或 revalidate 钩子刷新前端缓存（见 7.3）。
3. 双引擎意味着同一逻辑模型要维护两份 DDL，必须有自动化一致性校验兜底（见 5.4）。

---

## 2. 系统总览

```mermaid
flowchart LR
  U[读者浏览器]
  subgraph WEB[apps/web · Next.js 15]
    RSC[RSC / SSR 页面层]
    ISR[ISR + Cache Tag]
  end
  subgraph API[apps/api · Fastify 5 · 只读]
    RT[routes 路由层]
    SV[services 业务层]
    RPD[repositories · 唯一知晓方言的一层]
    PORT[DbPort 适配层]
  end
  INGEST[外部采集系统<br/>直接写库]
  DB[("PostgreSQL 14+<br/>生产<br/>─────────<br/>SQLite<br/>本地 / 测试")]
  U --> RSC --> ISR
  RSC -- HTTP JSON --> RT
  RT --> SV --> RPD --> PORT
  PORT -- SELECT --> DB
  INGEST -- "INSERT / UPDATE" --> DB
```

数据有两条单向通道：写入只来自外部采集系统，读取只由本站 `api` 提供。两者仅在数据库层交汇，互不调用对方。

**核心原则**

1. **前后端完全解耦**：Web 只经 HTTP JSON 访问数据，不直连数据库。
2. **纯读服务**：`api` 只暴露 GET（外加可选的浏览量上报），不存在内容写入接口。
3. **数据库即契约**：表结构只做增量（加列/加索引），不重命名、不删除、不改语义。
4. **引擎无关**：方言差异压缩在 `db/port` 与 repository 内部，service 以上不得出现方言写法。

---

## 3. 仓库结构

```
ai-blog/
├─ apps/
│  ├─ api/          # Fastify 后端（只读服务）
│  └─ web/          # Next.js 前端
├─ packages/
│  ├─ shared/       # DTO 类型、Zod schema、常量、工具（无框架依赖）
│  └─ config/       # 共享 tsconfig / eslint / tailwind preset
├─ data/            # SQLite 文件（gitignore，仅本地/测试；不部署、不备份）
├─ .nvmrc           # 22.23.4
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ package.json     # engines + packageManager 双锁定
```

依赖方向：`web → shared`，`api → shared`；`web` 与 `api` 无代码依赖；`api` 与采集系统无代码依赖（只共享数据库表）。

**运行时固定**：`.nvmrc` 写 `22.23.4`，`engines: ">=22.23 <23"`，`packageManager: "pnpm@12.16.1"`，`.npmrc` 开 `engine-strict=true`；镜像与 CI 统一 `node:22-alpine`。`pnpm setup:node` 在装依赖前自检版本并直接失败。

---

## 4. 后端架构

### 4.1 目录

```
apps/api/
├─ src/
│  ├─ main.ts                 # 入口：读配置 → buildApp → listen → 优雅退出
│  ├─ app.ts                  # 组装根：注册插件与模块（测试可直接 inject）
│  ├─ config/env.ts           # Zod 解析 env，导出强类型 config
│  ├─ core/                   # errors / error-handler / response / pagination / text
│  ├─ db/                     # model / schema.sqlite / schema.pg / port / clients / dialect / migrate / parity / seed
│  ├─ plugins/                # db / cors / helmet / rate-limit / swagger / request-context
│  ├─ modules/                # post / taxonomy / site（routes / service / repository / mapper）
│  └─ types/fastify.d.ts      # 扩展 app.db: DbPort / config
├─ drizzle/{sqlite,pg}/       # 两套方言迁移，编号一一对应
├─ drizzle.{sqlite,pg}.config.ts
└─ scripts/ddl/pg.sql         # 导出给采集系统的建表 SQL（仅生产）
```

无 `auth` 模块、无 `post.write.ts`、无上传模块 —— 不留「看起来能用」的空壳。

### 4.2 分层规则

| 层 | 只允许 | 禁止 |
| --- | --- | --- |
| routes | 解析 params/query、调用 service、发送响应 | 写 SQL、写业务规则、import drizzle |
| service | 业务规则、缓存、事务边界、组装 DTO | 接触 Request/Reply、抛 HTTP 状态码 |
| repository | Drizzle 查询、Row 映射、**方言差异** | 业务判断、跨 repository 调用 |
| core/plugins | 通用能力 | import 任何 `modules/*` |

依赖单向：`routes → service → repository → db`。反向依赖用工厂函数显式传参，不引入 DI 容器。

**方言边界**：只有 `db/port` 与 repository 允许出现方言代码，形态仅两种 —— 调 `port.dialect.xxx()` 助手，或用 `if (port.kind === 'pg')` 包住单个查询表达式。service 及以上出现 engine 判断即为违规（ESLint 拦截）。

### 4.3 模块注册

```ts
await app.register(healthRoutes)
await app.register(postRoutes, { prefix: '/api/v1' })
await app.register(taxonomyRoutes, { prefix: '/api/v1' })
await app.register(siteRoutes, { prefix: '/api/v1' })
// 写接口一律不注册：内容由外部采集系统直接写库
```

### 4.4 横切能力

- **db 插件**：按 `DB_DRIVER` 创建 `DbPort` 注入 `app.db`，退出时 `close()`。
  - SQLite（本地/测试）：`better-sqlite3` 单连接，只设 `foreign_keys=ON`。
  - PostgreSQL（生产）：`pg.Pool`（`max=10`、`idleTimeout=30s`、`connectTimeout=5s`）。
- **error-handler**：`AppError` → 状态码 + 稳定错误码；未知异常 500，堆栈只进日志。方言错误码归一（`SQLITE_CONSTRAINT_UNIQUE` 与 PG `23505` 都映射 `CONFLICT(409)`）。
- **request-context**：`x-request-id` 透传，Pino 子 logger 绑定。
- **rate-limit**：读接口 120 req/min/IP。
- **swagger**：由路由 Schema 生成 OpenAPI，`/docs` 生产可关。

---

## 5. 数据访问层与双引擎

### 5.1 结构

```
db/model.ts          逻辑模型唯一来源（表/列/可空/索引意图，零方言）
      ↓
schema.sqlite.ts / schema.pg.ts     同一 model 的两个方言投影
      ↓
db/port.ts           DbPort：db + dialect + capabilities
      ↓
repository           一份查询逻辑，方言断言收口在工厂
```

```ts
export interface DbPort {
  kind: 'sqlite' | 'pg'
  db: SqliteDb | PgDb          // 类型不泄漏出 repository
  dialect: DialectHelpers      // ciLike / monthBucket / toNumber / transaction
  capabilities: { fts: boolean }
  ping(): Promise<boolean>
  close(): Promise<void>
}
```

TypeScript 无法把 `SQLiteDatabase` 与 `NodePgDatabase` 统一成同一类型，因此**每个 repository 工厂允许一次显式断言**，其余由泛型推导保证；该断言由"两引擎跑同一批集成测试"兜底。

不引入运行时改写 SQL 的方言无关层（Kysely 插件/自研重写器）：它掩盖不了 `ILIKE`、`ON CONFLICT`、窗口函数差异，还会破坏类型推导。选编译期双 schema + 明确分叉点，代价是两份 schema，收益是类型完备、报错定位准确。

### 5.2 差异对照

| 差异点 | SQLite | PostgreSQL | 统一做法 |
| --- | --- | --- | --- |
| 自增主键 | `INTEGER PK AUTOINCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY` | schema 各自声明，业务层只用 `number` |
| 布尔 | `INTEGER` 0/1 | `BOOLEAN` | Drizzle `boolean` 映射 |
| JSON | `TEXT` + 序列化 | `JSONB` | `text({mode:'json'})` / `jsonb()` |
| 时间 | 无原生类型 | `timestamp/timestamptz` | 统一 `INTEGER/BIGINT` 存 Unix ms |
| 大小写匹配 | `LIKE` 对 ASCII 不敏感 | `LIKE` 区分大小写 | `dialect.ciLike()`：`lower() LIKE` vs `ILIKE` |
| `count()` | `number` | `string` | `dialect.toNumber()` |
| 年月分桶 | `strftime` | `to_char(to_timestamp)` | `dialect.monthBucket()` |
| 事务 | 同步回调 | 异步回调 | `dialect.transaction()` 统一 `async` |
| 外键 | 默认关闭 | 默认开启 | 启动时显式开启 |
| 文本排序 | BINARY | 依 locale | 不依赖库排序：按 `published_at` / `sort_order` |
| 全文检索 | FTS5 | `tsvector` | 一期统一 `LIKE`；二期只在 PG 实现 |

**四条硬约定**

1. 分页必须带稳定次序 `ORDER BY published_at DESC, id DESC` —— PG 在等值排序键上不保证顺序，漏写 `id` 会翻页重复/丢行。
2. 时间一律 bigint 存 Unix ms，不用 `timestamp`。
3. 布尔只用 `true/false`，不写 `=== 1`。
4. JSON 字段只经 `site_meta.value`，业务层不 `JSON.parse`。

### 5.3 迁移双轨

- `drizzle.sqlite.config.ts` → `drizzle/sqlite/`，`drizzle.pg.config.ts` → `drizzle/pg/`，编号一一对应。
- **同一 PR 必须同时提交两份迁移**，CI 检查是否成对。
- 废弃字段三步：加新列双写 → 读新列 → 采集方停写后删除。
- 只导出 `scripts/ddl/pg.sql` 给采集系统；SQLite 建表由迁移在本地完成。

### 5.4 一致性校验（parity）

`db/parity.ts` 把两库元数据规范化后比对：

- SQLite 读 `PRAGMA table_info` / `index_list`；PG 读 `information_schema.columns` / `pg_indexes`。
- 比对表集合、列集合、可空性、类型归类、索引列顺序与唯一性。
- 默认值比语义而非字面量（`0` ≡ `false`）。
- 差异打印 + `exit 1`，CI 的 `parity` job 阻断合并。

### 5.5 没有跨库搬迁

生产库从第一天就是 PG，数据由采集系统直接写入，**不存在 SQLite → PG 的搬迁场景**，因此不写 `copy.ts`。本地想验证 PG 形态：`DB_DRIVER=postgres pnpm db:seed`。

### 5.6 能力边界

- "无缝"覆盖**代码层**：换库不改业务代码、API、前端。
- **不承诺并发等价**：SQLite 是单进程替身，锁竞争/隔离级别只在 PG 验证。
- **不承诺性能等价**：性能分析与 `EXPLAIN` 只在 PG 做。

---

## 6. 数据模型与写入契约

```mermaid
erDiagram
  CATEGORIES ||--o{ POSTS : "归类"
  POSTS ||--o{ POST_TAGS : ""
  TAGS ||--o{ POST_TAGS : ""
  POSTS ||--o{ POST_VIEWS : "统计"
```

### 6.1 表结构

**posts**

| 字段 | SQLite（测试） | PostgreSQL（生产） | 说明 |
| --- | --- | --- | --- |
| id | `INTEGER PK AUTOINCREMENT` | `BIGINT IDENTITY PK` | 主键 |
| slug | `TEXT UNIQUE NOT NULL` | 同左 | URL 标识、幂等键 |
| title | `TEXT NOT NULL` | 同左 | 标题 |
| excerpt | `TEXT` | 同左 | 摘要，可空 |
| content_md | `TEXT NOT NULL` | 同左 | Markdown 原文，唯一存储形式 |
| cover_url | `TEXT` | 同左 | 封面 |
| category_id | `INTEGER REFERENCES categories(id)` | `BIGINT REFERENCES categories(id)` | 可空 |
| status | `TEXT DEFAULT 'draft'` | 同左 | draft / published / archived |
| reading_time | `INTEGER DEFAULT 0` | 同左 | 分钟 |
| view_count | `INTEGER DEFAULT 0` | `BIGINT DEFAULT 0` | 浏览量 |
| featured | `INTEGER DEFAULT 0` | `BOOLEAN DEFAULT false` | 首页精选 |
| published_at | `INTEGER`（ms，可空） | `BIGINT`（ms，可空） | 发布时间 |
| created_at / updated_at | `INTEGER NOT NULL` | `BIGINT NOT NULL` | Unix ms |

索引：`slug`(unique)、`(status, published_at DESC)`、`(category_id)`、`(published_at DESC)`；两方言索引名一致（`idx_posts_status_published`），便于 parity 与巡检对照。

其余表：

- **categories**：`id, slug(unique), name, description, sort_order, created_at`
- **tags**：`id, slug(unique), name, created_at`
- **post_tags**：`post_id, tag_id` 复合主键 + `tag_id` 单独索引
- **site_meta**：`key PK, value`（SQLite `TEXT` JSON / PG `JSONB`）
- **post_views**：`post_id, date, count` 复合主键（可选趋势统计）

不建 `users` / `comments` 表：无后台、无评论。

> 统一用 `TEXT` 而非 `VARCHAR(n)`（SQLite 忽略长度、PG 会报错）；时间统一 Unix ms（避免时区与精度差异），DTO 层再转 ISO。

### 6.2 写入契约（采集系统 → DB）

本站是读方，表结构即契约：

| 约定 | 要求 |
| --- | --- |
| 唯一键 | 以 `posts.slug` 幂等（`ON CONFLICT(slug) DO UPDATE`） |
| 正文 | `content_md` 存 Markdown 原文，不允许 HTML 脚本 |
| 可见性 | 仅 `status='published'` 且 `published_at <= now` 对外可见 |
| 时间 | 三处时间字段均 Unix ms，`updated_at` 每次写入必更新 |
| 标签 | upsert 标签 + 建 `post_tags` 关联，**同一事务**内完成 |
| 分类 | `category_id` 可空；改名只改 `name`，不改 `slug` |
| 派生字段 | `reading_time`、`excerpt` 可留空，后端读取时兜底计算 |
| 边界 | 采集系统**不写** `view_count`、`site_meta` |

**巡检 SQL**（`pnpm db:check`，只在生产 PG 执行；SQLite 上默认拒绝）

```sql
SELECT slug FROM posts WHERE status='published' AND (content_md IS NULL OR trim(content_md)='');
SELECT p.slug FROM posts p LEFT JOIN post_tags pt ON pt.post_id = p.id
WHERE p.status='published' AND pt.post_id IS NULL;
SELECT slug, count(*) FROM posts GROUP BY slug HAVING count(*) > 1;
SELECT slug FROM posts WHERE published_at > :nowMs;   -- :nowMs 由脚本注入
```

### 6.3 并发与一致性

| 关注点 | PostgreSQL（生产） | SQLite（本地/测试） |
| --- | --- | --- |
| 并发 | MVCC，读写互不阻塞 | 不关心，单进程顺序执行 |
| 锁等待 | `lock_timeout` + 采集短事务 | 不设 `busy_timeout` |
| 连接 | `pg.Pool` max=10，`api` 无状态可多实例 | 单文件单连接 |
| 迁移阻塞 | 大表 `CREATE INDEX CONCURRENTLY` | 直接建，毫秒级 |
| 备份 | `pg_dump -Fc` + WAL 归档（按需 PITR） | 不备份，删文件重来 |

生产侧必守：采集多表写入包在单事务；加列必须带 `DEFAULT` 保证旧行可读；计数用 `SET x = x + 1` 单语句。

---

## 7. API 契约

### 7.1 统一响应体

```jsonc
// 成功
{ "success": true, "data": {}, "meta": { "page": 1, "pageSize": 10, "total": 42, "totalPages": 5 } }
// 失败
{ "success": false, "error": { "code": "POST_NOT_FOUND", "message": "文章不存在", "details": [] } }
```

错误码：`VALIDATION_ERROR(400)` `NOT_FOUND(404)` `CONFLICT(409)` `RATE_LIMITED(429)` `INTERNAL_ERROR(500)`。前端按 `code` 分支，不解析 message。

### 7.2 端点（前缀 `/api/v1`）

| 方法 | 路径 | 说明 | 缓存 |
| --- | --- | --- | --- |
| GET | `/health` | 存活 + DB 探活（回显 `driver`、`latencyMs`） | no-store |
| GET | `/posts` | 列表：`page` `pageSize` `tag` `category` `q` `featured` | 60s |
| GET | `/posts/:slug` | 详情（tags、上下篇） | 300s |
| GET | `/posts/:slug/related` | 相关文章 | 300s |
| GET | `/archive` | 按年月分组 | 300s |
| GET | `/tags` `/categories` | 全量 + 计数 | 300s |
| GET | `/search?q=` | 一期双方言 `LIKE`；二期 PG 启用 `tsvector` | 30s |
| GET | `/site/meta` | 站点信息 + About | 600s |
| POST | `/posts/:slug/view` | 浏览量 +1（可关闭） | no-store |
| POST | `/internal/revalidate` | 缓存钩子，token + 仅内网，不写业务数据 | no-store |

**只读约束**：公开契约里没有创建/更新/删除接口，任何未列出的 `POST/PUT/PATCH/DELETE` 统一 404。前端因此不需要登录态、Token、权限判断与 CSRF 防护。

DTO 字段与 Zod schema 置于 `packages/shared`，前后端共用 —— **具体字段定义另文讨论**。

### 7.3 缓存刷新（数据一致性）

采集系统直接写库，`api` 无法感知「发布事件」，因此三道保险：

1. **被动兜底（必做）**：`site` 模块每 30s 比对 `SELECT max(updated_at) FROM posts`，变化则触发定点失效，最多 30s 延迟。
2. **主动通知（推荐）**：采集写完后调 `/internal/revalidate`（token 校验、仅内网）。
3. **ISR 时间窗（兜底）**：列表 60s、详情 300s 自然过期。

失效粒度：`post:{slug}` / `list` / `tag:{slug}`，未受影响页面缓存保留。

---

## 8. 配置与部署

### 8.1 环境变量

```bash
# apps/api/.env
NODE_ENV=development
HOST=0.0.0.0
PORT=3001
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info
RATE_LIMIT_MAX=120
SITE_URL=http://localhost:3000

# —— 数据库：本地默认 sqlite；生产只允许 postgres ——
DB_DRIVER=sqlite
SQLITE_PATH=../../data/blog.db
# 生产 / 联调：
# DB_DRIVER=postgres
# DATABASE_URL=postgres://blog:secret@localhost:5432/blog
# PG_POOL_MAX=10
```

`config/env.ts` 用 Zod **discriminated union** 校验：缺参或混配（如 sqlite 配了 `DATABASE_URL`）启动瞬间失败并打印字段名。

**生产护栏**：`NODE_ENV=production` 且 `DB_DRIVER=sqlite` 时**拒绝启动**（除非显式 `ALLOW_SQLITE_IN_PROD=true`），防止本地配置误带线上。

### 8.2 常用脚本

```bash
# 工具链
nvm use && corepack enable && pnpm install
pnpm setup:node                        # 自检 node/pnpm 与 engines

# 开发
pnpm dev                               # 默认 SQLite
pnpm dev:pg                            # 连 PG（docker compose --profile pg up -d）

# 迁移（两套方言）
pnpm --filter api db:generate:sqlite
pnpm --filter api db:generate:pg
pnpm --filter api db:migrate           # 按 DB_DRIVER 自动选目录
pnpm --filter api db:export:ddl        # 导出 scripts/ddl/pg.sql

# 数据与校验
pnpm --filter api db:seed              # 样例文章（SQLite 或 PG）
pnpm --filter api db:check             # 采集巡检（仅 PG）
pnpm --filter api db:parity            # 结构一致性（CI 必跑）
```

### 8.3 部署

**只有一种形态：`api` + `web` + 托管 PG。** SQLite 不参与部署，只存在于开发机与 CI。

```mermaid
flowchart LR
  Client --> Nginx
  Nginx -- "/" --> Web[web:3000]
  Nginx -- "/api" --> LB[api:3001 × N]
  Web -- 内网 --> LB
  LB -- 只读账号 --> PG[("PostgreSQL 14+")]
  Ingest[采集系统<br/>任意主机] -- 写账号 --> PG
```

- `api` 无状态，可水平扩容；数据全在 PG，重启/扩缩容无影响。
- 采集系统可部署在任何能连到 PG 的位置，不需要与 `api` 同机。
- 读写账号分离：`api` 用 `blog_ro`（仅 SELECT），采集用 `blog_rw`，连接串走 Secret。
- `PG_POOL_MAX=10` 单实例；实例数 × 10 ≤ PG `max_connections` 的 80%。
- 备份：`pg_dump -Fc` + 对象存储，按需开启 WAL 归档做 PITR。
- `docker-compose`：`web` + `api`（`nginx` 视需要）；数据库用外部 PostgreSQL 14，compose 不启动数据库容器。
- 健康检查：`GET /api/v1/health`（含一次 `ping()`），`restart: unless-stopped`。
- 安全：helmet、CORS 白名单、限流、Zod 校验、ORM 参数化查询；Markdown 渲染层 sanitize（细节另文）。

---

## 9. 测试与演进

### 9.1 测试矩阵

| 层级 | 工具 | 覆盖重点 |
| --- | --- | --- |
| 单元 | Vitest | core 工具、pagination、service 业务规则 |
| 集成（SQLite，快） | Vitest + `app.inject()` + 临时库 | 路由契约、错误码、分页边界、404；本地默认跑 |
| 集成（PostgreSQL，权威） | Vitest + Testcontainers(`postgres:14`) | 同一批用例跑第二遍，验证方言等价 |
| 方言助手 | Vitest | `ciLike` / `monthBucket` / `toNumber` 两实现输出等价 |
| 结构一致性 | `db:parity`（CI job） | 两份迁移的表/列/索引/可空性完全对齐 |
| 端到端 | Playwright | 列表→详情→标签筛选→搜索主链路 |
| 契约 | `tsc --noEmit` | 前后端 DTO 一致性 |

**CI 门槛**：`lint` + `typecheck` + `test`（sqlite / postgres 双点）+ `db:parity` 全绿才允许合并。并发/事务/性能类用例只在 PG job 写，不在 SQLite 上假装验证。

### 9.2 演进路线

**一期（当前）**：只读博客 API + 前端展示；外部采集系统写生产 PG；双 schema + `DbPort` + parity，SQLite 负责本地与 CI 快速验证。

**二期（读侧增强，不引入写接口）**：PG `tsvector` 全文检索（`capabilities.fts` 控制，SQLite 继续走 `LIKE`）、RSS/sitemap/OG、浏览量统计与热门排序（物化视图）、图片 CDN。

**三期（可选）**：`pgbouncer` + 只读副本、`api` 多实例；评论如需接入，作为独立服务，不在本系统加写接口与鉴权。

**演进不破坏的边界**：前端只依赖 `/api/v1` 契约；表结构只增量演进，保证采集系统无需改动。

---

## 附：与设计文档的边界

页面信息架构、布局与断点、组件拆分、Server / Client 边界、Markdown 渲染管线、交互与动效、无障碍、SEO 与性能预算，全部见 **`DESIGN.md`**。本文只负责「系统怎么搭、数据怎么流、契约长什么样」。
