#!/usr/bin/env node
/**
 * 一键构建 / 推送 api + web 镜像。
 *
 *   node scripts/docker-build.mjs                 # 构建两个镜像
 *   node scripts/docker-build.mjs --push          # 构建并推送
 *   node scripts/docker-build.mjs --login --push  # 先登录再构建推送
 *
 * 凭据与仓库信息从环境变量或根目录 .env.docker 读取，不接受硬编码口令。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const IMAGES = [
  { name: 'ai-blog-api', dockerfile: 'apps/api/Dockerfile', label: 'API' },
  { name: 'ai-blog-web', dockerfile: 'apps/web/Dockerfile', label: 'Web' },
]

function loadEnvFile() {
  const file = resolve(ROOT, '.env.docker')
  if (!existsSync(file)) return {}
  const result = {}
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

const fileEnv = loadEnvFile()
const env = (key, fallback = '') => process.env[key] ?? fileEnv[key] ?? fallback

function parseArgs(argv) {
  const options = { tag: '', push: false, login: false, platform: '', noCache: false, only: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--push') options.push = true
    else if (arg === '--login') options.login = true
    else if (arg === '--no-cache') options.noCache = true
    else if (arg === '--tag' || arg === '-t') options.tag = argv[++i] ?? ''
    else if (arg === '--platform') options.platform = argv[++i] ?? ''
    else if (arg === '--only') options.only = (argv[++i] ?? '').toLowerCase()
    else if (arg === '--help' || arg === '-h') {
      console.log(`用法：node scripts/docker-build.mjs [选项]

  -t, --tag <tag>        镜像标签，默认 latest 或 .env.docker 里的 TAG
      --push             构建完成后推送
      --login            推送前执行 docker login（读 REGISTRY_USER / REGISTRY_PASSWORD）
      --platform <p>     指定目标平台，如 linux/amd64
      --no-cache         不使用构建缓存
      --only <api|web>   只处理其中一个镜像`)
      process.exit(0)
    } else {
      console.warn(`忽略未知参数：${arg}`)
    }
  }
  return options
}

const options = parseArgs(process.argv.slice(2))

const registry = env('REGISTRY', 'registry.cn-shenzhen.aliyuncs.com')
const namespace = env('NAMESPACE', 'ycp')
const tag = options.tag || env('TAG', 'latest')
const repoPrefix = `${registry}/${namespace}`

function run(command, args, extra = {}) {
  execFileSync(command, args, { stdio: 'inherit', cwd: ROOT, ...extra })
}

function ensureDocker() {
  try {
    execFileSync('docker', ['--version'], { stdio: 'ignore' })
  } catch {
    console.error('未检测到 docker 命令，请先安装 Docker 并确认当前用户可用。')
    process.exit(1)
  }
}

function login() {
  const user = env('REGISTRY_USER')
  const password = env('REGISTRY_PASSWORD')
  if (!user || !password) {
    console.error('登录需要 REGISTRY_USER 与 REGISTRY_PASSWORD（环境变量或 .env.docker）。')
    process.exit(1)
  }
  console.log(`\n==> 登录 ${registry}（用户 ${user}）`)
  // 密码走 stdin，避免出现在进程列表与 shell 历史
  execFileSync('docker', ['login', registry, '-u', user, '--password-stdin'], {
    input: password,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}

function build(image) {
  const refs = [`${repoPrefix}/${image.name}:${tag}`]
  if (tag !== 'latest') refs.push(`${repoPrefix}/${image.name}:latest`)

  console.log(`\n==> 构建 ${image.label}：${refs[0]}`)
  const args = ['build', '-f', image.dockerfile]
  for (const ref of refs) args.push('-t', ref)
  if (options.platform) args.push('--platform', options.platform)
  if (options.noCache) args.push('--no-cache')
  args.push('.')
  run('docker', args)
  return refs
}

function push(refs) {
  for (const ref of refs) {
    console.log(`\n==> 推送 ${ref}`)
    run('docker', ['push', ref])
  }
}

function main() {
  ensureDocker()

  const targets = IMAGES.filter((image) => {
    if (!options.only) return true
    return image.name.endsWith(`-${options.only}`)
  })
  if (targets.length === 0) {
    console.error(`--only 只接受 api 或 web，收到：${options.only}`)
    process.exit(1)
  }

  console.log(`仓库：${repoPrefix}`)
  console.log(`标签：${tag}`)
  console.log(`镜像：${targets.map((image) => image.name).join(', ')}`)

  if (options.login) login()

  const built = []
  for (const image of targets) built.push(build(image))

  if (options.push) {
    for (const refs of built) push(refs)
    console.log('\n完成：镜像已推送')
  } else {
    console.log('\n完成：镜像已构建（未推送）。加 --push 可推送到仓库。')
  }
}

main()
