import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description?: string
  action?: { href: string; label: string }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex rounded-full border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:text-fg"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
