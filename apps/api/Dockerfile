# 构建上下文必须是仓库根：api 依赖 packages/shared 的 TS 源码
# 不用 `# syntax=docker/dockerfile:1`：该指令要从 docker.io 拉 frontend 镜像，受限网络下会失败

# ---------- 依赖层：装编译工具，把 better-sqlite3 这类原生模块编出来 ----------
FROM node:22-bookworm-slim AS deps

WORKDIR /app

ENV npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

# better-sqlite3 的预编译包从 GitHub release 下载，网络受限时会回落 node-gyp，
# 因此这里带上一套最小工具链；这些工具不会进入最终镜像
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# 先装依赖再拷源码，改动业务代码不会让依赖层失效
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

RUN npm install \
    && npm --prefix apps/api install \
    && npm prune --omit=dev \
    && npm --prefix apps/api prune --omit=dev \
    && npm cache clean --force

# ---------- 运行层：只带运行期依赖与源码 ----------
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

# --chown 直接落权限，避免额外 RUN chown 复制出整层
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --chown=node:node package.json ./
# apps/api/tsconfig.json 继承根配置，tsx 靠它解析 @ai-blog/shared 的路径映射
COPY --chown=node:node tsconfig.base.json ./
COPY --chown=node:node packages/shared ./packages/shared
COPY --chown=node:node apps/api ./apps/api

RUN mkdir -p /app/data \
    && chown node:node /app/data \
    && chmod +x /app/apps/api/docker-entrypoint.sh

USER node
WORKDIR /app/apps/api

EXPOSE 3001

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
