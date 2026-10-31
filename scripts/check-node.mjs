#!/usr/bin/env node
// 校验运行时版本，避免 engines 被忽略后出现「本地能跑、CI 挂」的问题。
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const wantedNode = readFileSync(join(root, '.nvmrc'), 'utf8').trim()
const wantedPnpm = pkg.packageManager?.split('@')[1] ?? 'unknown'
const actualNode = process.versions.node
const actualPnpm = process.env.npm_config_user_agent?.match(/pnpm\/(\S+)/)?.[1] ?? 'unknown'

const fail = []
if (actualNode !== wantedNode) fail.push(`node  期望 ${wantedNode}，实际 ${actualNode}`)
if (actualPnpm !== 'unknown' && actualPnpm !== wantedPnpm) {
  fail.push(`pnpm  期望 ${wantedPnpm}，实际 ${actualPnpm}`)
}

if (fail.length > 0) {
  console.error('\n运行时版本不匹配：')
  for (const line of fail) console.error(`  - ${line}`)
  console.error('\n修复：nvm use && corepack enable && pnpm install\n')
  process.exit(1)
}

console.log(`运行时检查通过：node ${actualNode} / pnpm ${actualPnpm}`)
