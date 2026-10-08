'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PetAvatar } from '@/components/pets/PetAvatar'
import { ChatIcon, GearIcon, LogoMark, PawIcon, PlusIcon, SignOutIcon } from '@/components/ui/Icons'
import type { Species } from '@/lib/types'

export interface NavPet {
  id: string
  name: string
  species: Species | null
  photo: string | null
  /** Something is overdue or expired for this pet. */
  alert: boolean
}

/**
 * The same navigation renders in the desktop rail and the mobile drawer, so
 * it takes an onNavigate hook for the drawer to close itself.
 */
export function SidebarNav({ pets, email, onNavigate }: { pets: NavPet[]; email: string | null; onNavigate?: () => void }) {
  const path = usePathname()
  const active = (href: string) => path === href
  const inPet = (id: string) => path.startsWith(`/pets/${id}`)

  return (
    <div className="flex h-full flex-col">
      <Link href="/pets" onClick={onNavigate} className="flex items-center gap-2.5 px-2 font-display text-[18px] font-bold tracking-tight">
        <LogoMark size={30} />
        SGPetCare
      </Link>

      <nav className="mt-8 space-y-1" aria-label="Main">
        <NavItem href="/pets" active={active('/pets')} onClick={onNavigate} icon={<PawIcon size={18} />}>
          My pets
        </NavItem>
        <NavItem href="/qa" active={active('/qa')} onClick={onNavigate} icon={<ChatIcon size={18} />}>
          Ask about pet care
        </NavItem>
        <NavItem href="/settings" active={active('/settings')} onClick={onNavigate} icon={<GearIcon size={18} />}>
          Settings
        </NavItem>
      </nav>

      <div className="mt-8 flex items-center justify-between px-2">
        <p className="eyebrow">Your pets</p>
        <Link
          href="/pets/new"
          onClick={onNavigate}
          className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-subtle hover:text-primary"
          aria-label="Add a pet"
        >
          <PlusIcon size={15} />
        </Link>
      </div>

      <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {pets.length === 0 && <li className="px-2 py-1.5 text-[13px] text-muted">No pets yet</li>}
        {pets.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pets/${p.id}`}
              onClick={onNavigate}
              aria-current={inPet(p.id) ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14px] transition ${
                inPet(p.id) ? 'bg-surface font-semibold text-text shadow-card ring-1 ring-border' : 'text-muted hover:bg-subtle hover:text-text'
              }`}
            >
              <PetAvatar photo={p.photo} species={p.species} name={p.name} size="xs" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.alert && <span className="h-2 w-2 shrink-0 rounded-full bg-expired" title="Something is overdue" />}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-border pt-4">
        {email && <p className="truncate px-2 text-[12px] text-muted">{email}</p>}
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-ghost mt-1 w-full justify-start px-2 py-2 text-[13px]">
            <SignOutIcon size={16} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

function NavItem({
  href,
  active,
  icon,
  children,
  onClick,
}: {
  href: string
  active: boolean
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-[14px] font-medium transition ${
        active ? 'bg-surface text-primary-ink shadow-card ring-1 ring-border' : 'text-muted hover:bg-subtle hover:text-text'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}

export function Sidebar(props: { pets: NavPet[]; email: string | null }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-background px-4 py-6 lg:block">
      <SidebarNav {...props} />
    </aside>
  )
}
