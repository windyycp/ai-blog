import type { ReactNode } from 'react'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { visit } from 'unist-util-visit'
import type { Element, Root, RootContent } from 'hast'
import type { Schema } from 'hast-util-sanitize'
import type { TocItem } from '@/types'

export interface RenderedMarkdown {
  content: ReactNode
  toc: TocItem[]
}

/** sanitize 在 pretty-code 之前跑：只清洗外部内容，后续的节点都是我们自己生成的 */
const schema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./]],
    th: [...(defaultSchema.attributes?.th ?? []), ['align']],
    td: [...(defaultSchema.attributes?.td ?? []), ['align']],
    img: [...(defaultSchema.attributes?.img ?? []), ['loading'], ['decoding']],
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: { className: ['anchor'], 'data-anchor': '', 'aria-hidden': 'true', tabIndex: -1 },
    content: { type: 'text', value: '#' },
  })
  .use(rehypePrettyCode, {
    theme: { light: 'github-light', dark: 'github-dark' },
    keepBackground: false,
    defaultLang: { block: 'text', inline: 'text' },
  })

function textOf(node: Element): string {
  const parts: string[] = []
  const walk = (children: RootContent[]): void => {
    for (const child of children) {
      if (child.type === 'text') parts.push(child.value)
      else if (child.type === 'element') walk(child.children)
    }
  }
  walk(node.children)
  return parts.join('').trim()
}

/**
 * 渲染只在 Server Component 调用，结果随 ISR 缓存。
 * 渲染在 web 而非 api：样式与高亮主题属于前端资产，改设计不必回滚后端。
 */
export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  // 管线终点是 hast（没有 compiler），所以用 parse + run 而不是 process
  const tree = (await processor.run(processor.parse(markdown))) as Root

  const toc: TocItem[] = []
  visit(tree, 'element', (node: Element) => {
    if (node.tagName !== 'h2' && node.tagName !== 'h3') return
    const id = node.properties?.id
    if (typeof id !== 'string') return
    toc.push({ id, text: textOf(node), depth: node.tagName === 'h2' ? 2 : 3 })
  })

  const content = toJsxRuntime(tree, { Fragment, jsx, jsxs, development: false })

  return { content, toc: toc.slice(0, 12) }
}
