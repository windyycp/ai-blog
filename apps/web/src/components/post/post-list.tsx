import type { PostSummary } from '@/types'
import { PostCard } from './post-card'

interface PostListProps {
  posts: PostSummary[]
  /** 是否把第一条渲染成头条样式 */
  highlightFirst?: boolean
}

export function PostList({ posts, highlightFirst = false }: PostListProps) {
  return (
    <ul className="flex flex-col gap-8">
      {posts.map((post, index) => (
        <li key={post.slug}>
          <PostCard post={post} featured={highlightFirst && index === 0} priority={index === 0} />
        </li>
      ))}
    </ul>
  )
}
