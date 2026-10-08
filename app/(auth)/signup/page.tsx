import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { GoogleButton } from '@/components/auth/GoogleButton'

export const metadata: Metadata = { title: 'Create an account' }

export default function SignupPage() {
  return (
    <AuthShell
      title="Start your pet's record"
      subtitle="Add your pet, log the last vaccination from their booklet, and we will remind you before the next one."
    >
      <GoogleButton next="/pets/new" label="Sign up with Google" />
      <p className="text-center text-[13px] text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-text underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
