import Link from 'next/link'
import { LogoMark } from '@/components/ui/Icons'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <Link href="/" className="relative mb-10 flex items-center gap-2.5 font-display text-[19px] font-bold tracking-tight">
        <LogoMark size={32} />
        SGPetCare
      </Link>
      <div className="card relative w-full max-w-sm animate-rise-in p-7 shadow-lift">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>
        <div className="mt-6 space-y-4">{children}</div>
      </div>
      <p className="relative mt-8 max-w-xs text-center text-xs leading-relaxed text-muted">
        Google is only used to sign you in. Your pets&apos; records and vet notes stay private to your account.
      </p>
    </main>
  )
}
