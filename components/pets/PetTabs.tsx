'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function PetTabs({ petId, licenceAlert }: { petId: string; licenceAlert: boolean }) {
  const path = usePathname()
  const base = `/pets/${petId}`
  const tabs = [
    { href: base, label: 'Overview' },
    { href: `${base}/health`, label: 'Health' },
    { href: `${base}/licensing`, label: 'Licensing', alert: licenceAlert },
  ]

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Pet sections">
      {tabs.map((t) => {
        const active = path === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[14px] font-semibold transition ${
              active ? 'border-primary text-text' : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
            {t.alert && <span className="h-1.5 w-1.5 rounded-full bg-expired" aria-label="needs attention" />}
          </Link>
        )
      })}
    </nav>
  )
}
