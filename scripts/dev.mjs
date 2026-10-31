#!/usr/bin/env node
// 并行启动 api 与 web；任一进程退出即整体退出，避免残留孤儿进程。
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const root = fileURLToPath(new URL('..', import.meta.url))

const children = [
  { name: 'api', cwd: `${root}apps/api` },
  { name: 'web', cwd: `${root}apps/web` },
].map(({ name, cwd }) => {
  const child = spawn(npm, ['run', 'dev'], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, FORCE_COLOR: '1' },
  })
  child.on('exit', (code) => {
    console.log(`[${name}] 退出（code=${code}）`)
    for (const other of children) if (other !== child) other.kill()
    process.exit(code ?? 0)
  })
  return child
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill()
    process.exit(0)
  })
}
