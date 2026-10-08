'use client'

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <p className="text-4xl" aria-hidden>
        🙀
      </p>
      <h1 className="mt-3 font-display text-xl font-bold tracking-tight">That page did not load</h1>
      <p className="mt-2 text-sm text-muted">Your records are safe. It is usually a blip in the connection.</p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  )
}
