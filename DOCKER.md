# Docker 构建与部署

本文件说明如何把 api 与 web 打成镜像、推送到阿里云容器镜像服务，并用 Docker Compose 启动整套服务。

## 前置条件

- Docker 24+ 与 Docker Compose v2（`docker compose version` 可用）
- 能访问 `registry.cn-shenzhen.aliyuncs.com`
- 首次构建会拉取 `node:22-bookworm-slim`，约 80MB
- 一个可用的 PostgreSQL 实例，版本 ≥ 14（compose 不负责启动数据库）

## 相关文件

| 文件 | 作用 |
| --- | --- |
| `docker-compose.yml` | 编排 `api`、`web` 两个服务（数据库用外部 PostgreSQL） |
| `apps/api/Dockerfile` | api 镜像，两阶段（依赖层编译原生模块 / 运行层只带运行期依赖），内含迁移入口 |
| `apps/api/docker-entrypoint.sh` | 启动前按 driver 跑迁移，再以前台进程启动服务 |
| `apps/web/Dockerfile` | web 镜像，两阶段：builder 产出 standalone，runner 只带运行产物 |
| `scripts/docker/web-build.sh` | 构建期拉起临时 sqlite api，供 ISR 页面预渲染 |
| `scripts/docker/web-entrypoint.sh` | web 容器入口：前台跑 server，后台跑一次预热 |
| `scripts/docker/web-warmup.mjs` | 容器启动后失效并预热首屏，避免重启后首屏为空 |
| `scripts/docker-build.mjs` | 一键构建 / 推送两个镜像 |
| `.env.docker.example` | compose 与构建脚本的变量模板 |

镜像名固定为：

```
registry.cn-shenzhen.aliyuncs.com/ycp/ai-blog-api:<tag>
registry.cn-shenzhen.aliyuncs.com/ycp/ai-blog-web:<tag>
```

## 镜像设计要点

- **构建上下文是仓库根**，因为 `apps/api` 与 `apps/web` 都依赖 `packages/shared` 的 TS 源码，`docker build -f apps/api/Dockerfile .` 必须带上这个目录。
- **api 镜像直接运行 TS 源码**（`tsx src/main.ts`），与本地 `npm start` 行为一致，避免 `tsconfig paths` 在编译后丢失模块解析而要多做一层 dist 软链。因此 `tsx` 被归到 `dependencies`。
- **web 镜像用 Next.js standalone**：`next.config.ts` 在 `NEXT_OUTPUT=standalone` 时输出自包含产物，runner 阶段只需 `node apps/web/server.js`。
- **构建期必须有数据源**：首页、列表页、标签页会在 `next build` 时预渲染，命中不到 api 会直接失败。`scripts/docker/web-build.sh` 因此在容器内用临时 sqlite 库起一个本地 api（`127.0.0.1:3001`），构建结束后立刻回收，外部无需可用 api。
- **构建期数据是空的**：`web-build.sh` 起的临时 sqlite 库只有表结构没有内容，所以预渲染出的 `/`、`/tags`、`/archive`、`/about` 是空状态。这份产物在容器重启后就是首屏内容，因此 runner 阶段用 `web-entrypoint.sh` 在服务就绪后主动失效并预热（见下文「重启后首屏为什么不能是空的」）。
- **基础镜像用 debian 而非 alpine**：`better-sqlite3` 走预编译产物，musl 上没有现成二进制，换 alpine 会拖入编译工具链并显著变慢。
- **api 不对外暴露端口**：compose 里只有 web 映射到宿主，浏览器需要的浏览量上报由 web 的 `/api/views/[slug]` 同源代理转发到 `http://api:3001`，因此不需要 CORS，也不用把 api 暴露到公网。
- **站点地址是构建参数**：`NEXT_PUBLIC_SITE_URL` 决定 canonical / `og:url`，`next build` 时会写进静态页，所以它以 `build.args` 传入 web 镜像；运行时同名环境变量只影响 sitemap / RSS 等动态路由。
- **compose 不带数据库服务**：PostgreSQL 由外部实例提供，`api` 只吃 `DATABASE_URL`；需要连宿主机上的 PG 时用 `host.docker.internal`（compose 已给 api 加 `host-gateway` 映射）。

## 构建并推送（一键）

```bash
cp .env.docker.example .env.docker   # 已存在则跳过
# 编辑 .env.docker：填 REGISTRY_PASSWORD、DATABASE_URL、REVALIDATE_SECRET、SITE_URL

npm run docker:push                  # = 登录 + 构建 + 推送
npm run docker:build                 # 只构建、不推送
```

脚本等价于：

```bash
node scripts/docker-build.mjs --login --push
```

常用参数：

```bash
node scripts/docker-build.mjs --tag 2026-10-31          # 指定版本标签（同时打 latest）
node scripts/docker-build.mjs --only web --push         # 只处理 web
node scripts/docker-build.mjs --platform linux/amd64    # 交叉构建（Apple Silicon 打 amd64 镜像）
node scripts/docker-build.mjs --no-cache --push         # 不走缓存
```

手工登录时用 stdin 传口令，避免口令进入 shell 历史与进程列表：

```bash
printf '%s' "$REGISTRY_PASSWORD" | docker login -u ycpaly --password-stdin registry.cn-shenzhen.aliyuncs.com
```

> 口令只从环境变量或 `.env.docker` 读取，`.env.docker` 已被 `.gitignore` 忽略。不要把口令写进脚本、README 或提交记录。

## 用 Compose 启动

```bash
npm run docker:up          # docker compose --env-file .env.docker up -d
npm run docker:logs        # 跟踪 api / web 日志
docker compose --env-file .env.docker ps
```

启动前先确认 `DATABASE_URL` 指向的 PostgreSQL 可达：api 容器启动时会立刻跑迁移，连不上就会反复重启，`docker compose logs api` 里能看到 `ECONNREFUSED` / `password authentication failed`。

启动后：

- 站点：<http://localhost:3000>
- api 健康检查：`docker compose exec api node -e "fetch('http://127.0.0.1:3001/api/v1/health').then(r=>r.text()).then(console.log)"`

首次部署灌入样例内容（生产模式下 seed 需要显式放行）：

```bash
docker compose --env-file .env.docker exec -T -e ALLOW_SEED=true \
  api ./node_modules/.bin/tsx src/db/seed/seed.ts
```

手工灌完数据（或内容有批量变更）后，可以主动失效一次：

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "content-type: application/json" \
  -H "x-revalidate-secret: dev-revalidate-secret" \
  -d '{"tags":["list","site","archive"],"paths":["/","/tags","/archive","/about"]}'
```

`tags` 失效数据缓存，`paths` 失效整页缓存（full route cache），两者可只给其一。

### 重启后首屏为什么不能是空的

构建 web 镜像时用的是**空的临时 sqlite 库**（只为让 ISR 页面能构建出来），所以 `/`、`/tags`、`/archive`、`/about` 的预渲染 HTML 里是空状态。容器重启后 Full Route Cache 回到构建期版本，如果什么都不做，用户点进这些页面会看到空白，得等 ISR 过期（60s ~ 1h）或手动刷新才恢复。

所以 web 镜像的入口是 `scripts/docker/web-entrypoint.sh`：

1. 拉起 `apps/web/server.js`；
2. 后台跑 `scripts/docker/web-warmup.mjs`：等 3000 就绪 → `POST /api/revalidate` 失效 `list` / `site` / `archive` 与首屏路径 → 逐个 GET 预热，把新内容生成出来。

日志里能看到：

```
[warmup] 失效 tags=list,site,archive paths=/,/tags,/archive,/about,/posts → 200
[warmup] 预热 /tags → 200
[warmup] 完成
```

因此重启后（`docker compose up` 或整机重启）第一次点击标签 / 归档 / 关于就是实时数据，不需要刷新。预热依赖 `REVALIDATE_SECRET`，没配置时脚本会跳过并在日志里提示，此时只能等 ISR 自然过期。

停止与清理：

```bash
npm run docker:down                    # 停止并移除容器
docker compose down -v                 # 连 blogdata 卷一起删（sqlite 模式下会丢数据）
```

外部 PostgreSQL 的数据不受上述命令影响，容器重启也不会触发迁移回滚。

## 环境变量

`.env.docker` 同时供 compose 插值和构建脚本读取。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `REGISTRY` | `registry.cn-shenzhen.aliyuncs.com` | 镜像仓库地址 |
| `NAMESPACE` | `ycp` | 仓库命名空间 |
| `TAG` | `latest` | 镜像标签 |
| `REGISTRY_USER` | `ycpaly` | 登录用户名 |
| `REGISTRY_PASSWORD` | 空 | 登录口令（必填，仅本地保存） |
| `SITE_URL` | `http://localhost:3000` | 站点对外地址；同时作为 web 镜像的构建参数（canonical）与运行时变量（sitemap / RSS） |
| `WEB_PORT` | `3000` | web 对外端口 |
| `DB_DRIVER` | `postgres` | `postgres` / `sqlite` |
| `DATABASE_URL` | 空 | 必填（postgres），外部 PostgreSQL 连接串 |
| `PG_POOL_MAX` | `10` | api 侧连接池上限 |
| `SQLITE_PATH` | 空 | 仅 sqlite 模式使用，容器内建议 `/app/data/blog.db` |
| `ALLOW_SQLITE_IN_PROD` | `false` | 生产用 sqlite 时必须显式置 `true` |
| `REVALIDATE_SECRET` | `dev-revalidate-secret` | `/api/revalidate` 的共享密钥 |

## 数据库

compose 只跑 `api` 与 `web`，**不启动数据库容器**。PostgreSQL 用现成实例，把连接串写进 `.env.docker`：

```ini
DB_DRIVER=postgres
DATABASE_URL=postgres://用户:口令@host.docker.internal:5432/blog
```

- PG 在宿主机上：用 `host.docker.internal`（compose 已为 api 加了 `host.docker.internal:host-gateway`，Linux 也能解析）。
- PG 在另一台机器 / 云数据库：直接写它的地址，注意放行 api 所在机器的出口 IP。
- api 启动时（`RUN_MIGRATIONS=true`）会先跑迁移，空库也能直接起来。

**版本要求：PostgreSQL 14 及以上。** 迁移与查询已在 **14.24** 上实测通过（建表、`GENERATED ... AS IDENTITY`、`gen_random_uuid()`、并发 upsert 浏览量、seed 落库均正常）。低于 14 未验证，不建议使用。

本机没有现成 PG 时，可以单独起一个 14 实例当“外部库”（不写进 compose，也不影响 `docker compose down`）：

```bash
docker run -d --name blog-pg --restart unless-stopped \
  -e POSTGRES_USER=blog -e POSTGRES_PASSWORD=blog-change-me -e POSTGRES_DB=blog \
  -v blog-pgdata:/var/lib/postgresql/data -p 5433:5432 postgres:14-alpine

# .env.docker 里对应写：
# DATABASE_URL=postgres://blog:blog-change-me@host.docker.internal:5433/blog
```

若想用轻量 sqlite（单机小站、无 pg 依赖），改成：

```ini
DB_DRIVER=sqlite
# DATABASE_URL 必须留空，否则 api 启动会报「两者混配」
SQLITE_PATH=/app/data/blog.db
ALLOW_SQLITE_IN_PROD=true
```

`blogdata` 卷挂在 `/app/data`，sqlite 文件随之持久化；postgres 模式下这个卷不会被写入。

## 构建期预渲染说明

web 镜像构建时用的是**空库**，所以产物里的首页可能是「暂无文章」空状态。站点上线后：

- 页面设有 `revalidate`（首页 60s、文章 300s），首次访问后会异步刷新，最多一分钟即可看到真实内容；
- 想立刻刷新，调用一次按需失效接口：

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "content-type: application/json" \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"tags":["list","site"]}'
```

## 常见问题

**构建 web 时卡在「预渲染 api 未就绪」**：`web-build.sh` 会打印 `tsx src/main.ts` 的日志，多半是迁移失败或端口被占。单独重跑该层：`node scripts/docker-build.mjs --only web --no-cache`。

**`better-sqlite3` 报 NODE_MODULE_VERSION 不一致**：不要混用本地 `node_modules`，`.dockerignore` 已排除，确认构建上下文没带进来。

**构建时报 `gyp ERR!` / `not ok`**：说明 `better-sqlite3` 的预编译包下载失败，回落到了源码编译。api 镜像的 `deps` 阶段与 web 的 builder 阶段都已装 `python3 make g++`，若仍失败通常是 apt 源不可达，可先 `docker run --rm node:22-bookworm-slim apt-get update` 排查。

**构建时报 `ERR_MODULE_NOT_FOUND: @ai-blog/shared`**：`tsx` 靠 `apps/api/tsconfig.json` 继承根 `tsconfig.base.json` 的 `paths` 来解析工作区包，两个 Dockerfile 都必须把 `tsconfig.base.json` 一起 COPY 进去。

**`/_global-error` 预渲染失败，报 `Cannot read properties of null (reading 'use')`**：`next build` 跑在 `NODE_ENV=development` 下会触发，`scripts/docker/web-build.sh` 已固定切到 `production`。

**改了域名但页面 canonical 还是旧的**：`NEXT_PUBLIC_SITE_URL` 在构建期烘焙进静态页，只改 `.env.docker` 不够，需要重建 web 镜像（`SITE_URL=https://你的域名 npm run docker:build -- --only web --push`）。

**`next start` 在容器里不可用**：standalone 模式由 `node apps/web/server.js` 启动，`package.json` 里的 `start` 脚本只服务本地开发。

**镜像体积**：实测 api 约 427MB、web 约 442MB，其中 `node:22-bookworm-slim` 基础层约 230MB。运行时依赖只有 87MB 左右，因此两个 Dockerfile 都用 `COPY --chown=node:node` 落权限，而不是再 `RUN chown -R` —— 后者会复制出 90MB 的冗余层。要再压可以换 distroless 基础镜像，但需要自行处理 shell 与健康检查。

## 更新发布流程

```bash
git pull
npm run docker:push -- --tag 2026-10-31     # 构建并推送新标签
TAG=2026-10-31 npm run docker:up            # 或直接改 .env.docker 里的 TAG
```

`docker:up` 会按新标签拉取镜像并重建容器；数据卷 `blogdata` 不受影响，外部 PostgreSQL 里的数据也不受容器重建影响。
