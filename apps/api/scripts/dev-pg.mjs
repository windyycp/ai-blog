#!/usr/bin/env node
// 用 PG 起 api：不需要改 .env，DB_DRIVER 由父进程注入（dotenv 默认不覆盖已存在的变量）。
import { spawn } from 'node:child_process'

const child = spawn(process.platform === 'win32' ? 'tsx.cmd' : 'tsx', ['watch', '--clear-screen=false', 'src/main.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, DB_DRIVER: 'postgres' },
})

child.on('exit', (code) => process.exit(code ?? 0))
