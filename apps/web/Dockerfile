# 构建上下文必须是仓库根：web 依赖 packages/shared 与 apps/api（构建期临时数据源）
# 不用 `# syntax=docker/dockerfile:1`：该指令需要从 docker.io 拉 frontend 镜像，受限网络下会失败
FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone \
    npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

# canonical / og:url 会在构建期写进静态页，站点地址必须构建时确定
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# 构建期要跑 api（用 better-sqlite3），没有预编译包时回落 node-gyp，需要最小工具链
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
# tsx 依赖根 tsconfig 的 paths 才能解析 @ai-blog/shared
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/

RUN npm install \
    && npm --prefix apps/api install \
    && npm --prefix apps/web install \
    && npm cache clean --force

COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY scripts/docker/web-build.sh /usr/local/bin/web-build.sh

RUN chmod +x /usr/local/bin/web-build.sh

# 构建期会拉起一个临时 sqlite api 供 ISR 页面预渲染
RUN web-build.sh

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# standalone 产物已包含 traced 的 node_modules；
# 用 --chown 直接落权限，避免再 RUN chown 复制出一整层（约 90MB）
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
# 启动前预热脚本：构建期是空库，重启后首屏要主动失效一次才不会是空页面
COPY --chown=node:node scripts/docker/web-warmup.mjs scripts/docker/web-entrypoint.sh ./scripts/docker/

RUN chmod +x ./scripts/docker/web-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker/web-entrypoint.sh"]
