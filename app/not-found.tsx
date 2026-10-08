import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🐾
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">Nothing sniffed out here</h1>
        <p className="mt-2 text-sm text-muted">That page does not exist, or the pet was removed.</p>
        <Link href="/pets" className="btn-primary mt-6">
          Back to my pets
        </Link>
      </div>
    </main>
  )
}
