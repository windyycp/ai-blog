export default function Loading() {
  return (
    <div className="animate-pulse pt-14 sm:pt-20" aria-busy="true" aria-live="polite">
      <div className="h-3 w-24 rounded bg-surface" />
      <div className="mt-4 h-8 w-2/3 rounded bg-surface" />
      <div className="mt-3 h-4 w-1/2 rounded bg-surface" />
      <div className="mt-14 space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="h-3 w-32 rounded bg-surface" />
            <div className="h-5 w-3/4 rounded bg-surface" />
            <div className="h-4 w-full rounded bg-surface" />
          </div>
        ))}
      </div>
      <span className="sr-only">正在加载</span>
    </div>
  )
}
