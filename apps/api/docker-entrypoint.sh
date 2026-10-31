#!/bin/sh
# 容器启动入口：先按 driver 跑迁移，再以前台进程启动服务
set -eu

cd /app/apps/api

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] 执行数据库迁移（DB_DRIVER=${DB_DRIVER:-sqlite}）"
  ./node_modules/.bin/tsx src/db/migrate.ts
fi

exec ./node_modules/.bin/tsx src/main.ts
