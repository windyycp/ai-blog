#!/usr/bin/env node
/**
 * 依赖安装入口。
 *
 * 为什么不用 pnpm workspace：pnpm 会把 workspace 包做成 junction，
 * 某些 Windows 安全策略下 Node 无法遍历 reparse point（os error 448）。
 * 这里改为「根 + 每个应用独立 npm install」，包间引用由 tsconfig paths 指向源码。
 *
 * zod 只装在根：apps/* 与 packages/shared 都靠 Node 向上查找拿到同一份实例，
 * 否则 instanceof ZodError 会因多份副本而失效。
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function install(dir) {
  const cwd = join(root, dir)
  const label = dir === '.' ? 'root' : dir
  console.log(`\n=== npm install (${label}) ===`)
  const result = spawnSync(npm, ['install', '--no-fund', '--no-audit'], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

install('.')
for (const dir of ['apps/api', 'apps/web']) {
  if (existsSync(join(root, dir, 'package.json'))) install(dir)
}

console.log('\n依赖安装完成')
