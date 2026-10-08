'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LogoMark, MenuIcon, XIcon } from '@/components/ui/Icons'
import { SidebarNav, type NavPet } from './Sidebar'

/** Top bar below the lg breakpoint. The menu opens the same nav as the desktop sidebar. */
export function Header({ pets, email }: { pets: NavPet[]; email: string | null }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()

  useEffect(() => setOpen(false), [path])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const alerts = pets.filter((p) => p.alert).length

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/pets" className="flex items-center gap-2 font-display text-[16px] font-bold tracking-tight">
          <LogoMark size={28} />
          SGPetCare
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="relative grid h-10 w-10 place-items-center rounded-xl text-muted transition hover:bg-subtle hover:text-text"
          aria-label={alerts ? `Open menu, ${alerts} pets need attention` : 'Open menu'}
          aria-expanded={open}
        >
          <MenuIcon size={20} />
          {alerts > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-expired" />}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 animate-fade-in bg-text/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-in border-r border-border bg-background px-4 py-6 shadow-lift">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-text"
              aria-label="Close menu"
            >
              <XIcon size={18} />
            </button>
            <SidebarNav pets={pets} email={email} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
