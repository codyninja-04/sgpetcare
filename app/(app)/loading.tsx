export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton h-4 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-40" />
        <div className="skeleton h-40" />
      </div>
    </div>
  )
}
