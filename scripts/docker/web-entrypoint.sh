#!/bin/sh
# web 容器入口：先拉起 Next standalone server，再在后台跑一次预热自愈。
# server 用 exec 接管 PID 1，保证信号（SIGTERM）能正确传递。
set -e

node /app/scripts/docker/web-warmup.mjs &

exec node /app/apps/web/server.js
