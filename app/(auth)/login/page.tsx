import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleButton } from '@/components/auth/GoogleButton'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = searchParams.next?.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '/pets'

  return (
    <AuthShell title="Welcome back" subtitle="Your pets' vaccinations, licences and vet notes are where you left them.">
      {searchParams.error && (
        <p role="alert" className="rounded-xl border border-expired/20 bg-expired/5 px-3 py-2 text-[13px] text-expired">
          Sign in did not finish. Give it another go.
        </p>
      )}
      <GoogleButton next={next} />
      <p className="text-center text-[13px] text-muted">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-text underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
