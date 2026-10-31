# AI Blog

一个面向 AI / 前端工程主题的个人博客：Fastify 提供内容 API，Next.js App Router 负责服务端渲染，数据默认落在 SQLite，生产使用 PostgreSQL 14+。

- **内容与展示分离**：文章只存 Markdown，渲染、代码高亮、目录生成都在前端做，改版式不用动后端。
- **双数据库同构**：同一套 Drizzle 实体与仓储代码跑 SQLite 与 PG，靠一层 dialect 适配差异，`db:parity` 校验两边结构一致。
- **可预期的缓存**：web 侧按 tag 缓存，内容变更后调用一个带密钥的接口即可精确失效。

## 技术栈

| 层 | 选型 |
| --- | --- |
| API | Fastify 5、Drizzle ORM、Zod、better-sqlite3 / pg、Vitest |
| Web | Next.js 16（App Router、ISR）、React 19、Tailwind CSS 4 |
| 内容渲染 | unified / remark / rehype + Shiki 双主题 |
| 共享 | `@ai-blog/shared`（schema、类型、缓存 tag、常量），源码直连，无构建步骤 |

## 目录

```
apps/api        Fastify 服务：db 层 / modules（post、taxonomy、site）/ test
apps/web        Next.js：app 路由、components、lib（api、markdown、seo）
packages/shared zod schema、TS 类型、常量
scripts         setup / dev / install 脚本
data            SQLite 数据文件（已 gitignore）
```

## 快速开始

要求 Node 22.11+（`.tools/node` 便携版亦可）。

```bash
npm run setup          # 检查 Node 版本 + 安装根、api、web 依赖
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:migrate     # 建表（SQLite 首次会自动创建 data/）
npm run db:seed        # 写入样例文章、标签、分类
npm run dev            # api :3001 + web :3000 并行
```

打开 http://localhost:3000 ，接口探活见 http://localhost:3001/api/v1/health 。

> `npm run build` 期间 api 需要可访问：首页、归档、标签等页面会在构建时预渲染。取数失败时页面直接抛给 `error.tsx`，不会把「服务不可用」缓存成静态空白页。

> 依赖安装不用 pnpm workspace：pnpm 的 workspace 软链在部分 Windows 安全策略下无法被 Node 遍历（`os error 448`），改为每个包独立 `npm install`，包间引用由 tsconfig paths 指向源码。`zod` 只装在根目录，保证全仓只有一份实例（否则 `ZodError` 的 `instanceof` 会失效）。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` / `dev:api` / `dev:web` | 开发模式（web 走 webpack，见下方说明） |
| `npm run build` | 依次构建 api 与 web |
| `npm run typecheck` | shared / api / web 三处类型检查 |
| `npm test` | api 集成测试（真实 SQLite + Fastify inject） |
| `npm run db:migrate` | 应用迁移 |
| `npm run db:seed` | 写入样例数据 |
| `npm run db:parity` | 校验 SQLite 与 PG 迁移产出的表/列/索引一致 |
| `npm run db:check` | 数据巡检：孤儿标签关联、缺失分类等 |
| `npm run dev:pg` | 用内存 PG（PGlite）启动 api 做联调 |

## 环境变量

**apps/api/.env**

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `HOST` / `PORT` | `0.0.0.0` / `3001` | 监听地址 |
| `LOG_LEVEL` | `info` | pino 日志级别 |
| `CORS_ORIGINS` | `http://localhost:3000` | 允许的前端来源，逗号分隔 |
| `RATE_LIMIT_MAX` | `120` | 每窗口请求上限 |
| `SITE_URL` | `http://localhost:3000` | 站点地址（用于接口返回的绝对链接） |
| `DB_DRIVER` | `sqlite` | `sqlite` / `postgres` |
| `SQLITE_PATH` | `../../data/blog.db` | SQLite 文件路径，相对 api 工作目录 |
| `DATABASE_URL` | — | PG 连接串，目标版本 PostgreSQL 14+ |

生产环境禁止用 SQLite 启动，必要时用 `ALLOW_SQLITE_IN_PROD=true` 显式放开。

**apps/web/.env.local**

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `API_BASE_URL` | `http://localhost:3001/api/v1` | 服务端渲染时访问 api |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | canonical / sitemap / RSS |
| `REVALIDATE_SECRET` | — | 按需失效接口的密钥 |

## 缓存与失效

列表页 60s、详情页 300s、站点信息 600s 的 ISR 缓存，同时打上 `list` / `post:<slug>` / `tag:<slug>` / `category:<slug>` / `archive` / `site` 等 tag。内容更新后：

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H 'content-type: application/json' \
  -H 'x-revalidate-secret: <REVALIDATE_SECRET>' \
  -d '{"tags":["list","post:hello-world"],"paths":["/","/tags"]}'
```

`tags` 失效数据缓存，`paths` 失效整页缓存，两者可只给其一。

## Docker 部署

api 与 web 均已容器化，镜像推送到阿里云 `registry.cn-shenzhen.aliyuncs.com/ycp/`，再用 Compose 启动整套服务：

```bash
cp .env.docker.example .env.docker   # 填 REGISTRY_PASSWORD / DATABASE_URL / REVALIDATE_SECRET / SITE_URL
npm run docker:push                  # 登录 + 构建 + 推送 api / web
npm run docker:up                    # compose 启动 api + web（数据库用外部 PostgreSQL）
```

compose 不启动数据库容器，`DATABASE_URL` 指向已有 PostgreSQL 实例；PG 在宿主机上时用 `host.docker.internal` 作主机名。

| 命令 | 说明 |
| --- | --- |
| `npm run docker:build` | 只构建两个镜像（不登录、不推送） |
| `npm run docker:push` | 登录 + 构建 + 推送，可用 `-- --tag 2026-10-31` 指定标签 |
| `npm run docker:up` | `docker compose --env-file .env.docker up -d` |
| `npm run docker:down` | 停止并移除容器 |
| `npm run docker:logs` | 跟踪日志 |

镜像设计、构建期预渲染、SQLite/PostgreSQL 切换与常见问题见 [DOCKER.md](./DOCKER.md)。

## 已知限制

- **web 构建用 webpack**：`@ai-blog/shared` 位于 `apps/web` 之外的上级目录，Turbopack 目前不支持 Windows 绝对路径 alias，脚本已固定 `--webpack`。
- **图片**：正文图片走 `next/image`，远程域名已在 `next.config.ts` 放开 `https`，上线前建议收窄到具体 CDN 域名。
- **搜索**：当前是 SQL `LIKE` 匹配，文章量到万级后建议换成 FTS5 / PG 全文索引。
