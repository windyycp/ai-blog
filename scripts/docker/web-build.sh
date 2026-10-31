#!/bin/sh
# Next 的 ISR 页面在 build 阶段要取数，镜像构建时没有外部 api，
# 这里用临时 sqlite 库拉起一个本地 api，构建完成后立刻回收。
set -eu

echo "[build] 迁移预渲染用临时库"
cd /app/apps/api
export NODE_ENV=development
export DB_DRIVER=sqlite
export SQLITE_PATH=/tmp/prerender.db
export HOST=127.0.0.1
export PORT=3001

./node_modules/.bin/tsx src/db/migrate.ts

echo "[build] 启动预渲染用 api"
./node_modules/.bin/tsx src/main.ts >/tmp/prerender-api.log 2>&1 &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT

i=0
until node -e "fetch('http://127.0.0.1:3001/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "[build] 预渲染 api 未就绪：" >&2
    cat /tmp/prerender-api.log >&2
    exit 1
  fi
  sleep 1
done

echo "[build] 构建 Next 产物"
cd /app/apps/web
# next build 必须在 production 下跑，development 会让 React 的条件分支错配，
# 表现为 _global-error 预渲染时报 "Cannot read properties of null (reading 'use')"
export NODE_ENV=production
export API_BASE_URL=http://127.0.0.1:3001/api/v1
npm run build
