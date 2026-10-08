import Link from 'next/link'
import type { Metadata } from 'next'
import { PetCard } from '@/components/pets/PetCard'
import { UpcomingList } from '@/components/pets/UpcomingList'
import { PlusIcon } from '@/components/ui/Icons'
import { daysUntil } from '@/lib/dates'
import { listPets } from '@/lib/pets'
import { listUpcoming } from '@/lib/reminders'
import { createClient } from '@/lib/supabase/server'
import { REMINDER_LABELS } from '@/lib/types'

export const metadata: Metadata = { title: 'My pets' }

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-SG', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Singapore' }).format(new Date()))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default async function PetsPage() {
  const supabase = createClient()
  const [pets, upcoming] = await Promise.all([listPets(supabase), listUpcoming(supabase, { limit: 60 })])

  if (pets.length === 0) return <EmptyState />

  const nextByPet = new Map<string, { label: string; due_date: string }>()
  for (const r of upcoming) {
    if (!nextByPet.has(r.pet_id)) nextByPet.set(r.pet_id, { label: r.label || REMINDER_LABELS[r.reminder_type], due_date: r.due_date })
  }

  const soon = upcoming.filter((r) => daysUntil(r.due_date) <= 45).slice(0, 8)
  const overdue = upcoming.filter((r) => daysUntil(r.due_date) < 0).length

  return (
    <div className="animate-rise-in space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {pets.length === 1 ? `How is ${pets[0].name}?` : 'Your pets'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {overdue > 0
              ? `${overdue} ${overdue === 1 ? 'thing is' : 'things are'} overdue. They are at the top of the list.`
              : soon.length > 0
                ? `${soon.length} ${soon.length === 1 ? 'thing' : 'things'} coming up in the next six weeks.`
                : 'Nothing due in the next six weeks.'}
          </p>
        </div>
        <Link href="/pets/new" className="btn-primary self-start sm:self-auto">
          <PlusIcon size={16} />
          Add a pet
        </Link>
      </header>

      <section aria-labelledby="coming-up">
        <h2 id="coming-up" className="mb-3 font-display text-lg font-bold tracking-tight">
          Coming up
        </h2>
        <UpcomingList reminders={soon} emptyText="Nothing due in the next six weeks. Nice." />
      </section>

      <section aria-labelledby="all-pets">
        <h2 id="all-pets" className="mb-3 font-display text-lg font-bold tracking-tight">
          All pets
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pets.map((p) => (
            <PetCard key={p.id} pet={p} next={nextByPet.get(p.id) ?? null} />
          ))}
          <Link
            href="/pets/new"
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted transition hover:border-primary/40 hover:bg-primary-soft/30 hover:text-primary"
          >
            <PlusIcon size={22} />
            Add another pet
          </Link>
        </div>
      </section>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-lg animate-rise-in py-10 text-center">
      <div className="mx-auto flex w-fit gap-2 text-5xl" aria-hidden>
        <span className="-rotate-6">🐕</span>
        <span className="rotate-6">🐈</span>
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Who are we looking after?</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        Add your first pet, then copy the last vaccination and deworming dates from their vet booklet. We will remind you before
        the next ones, and before their AVS licence runs out.
      </p>
      <Link href="/pets/new" className="btn-primary mt-8 px-6 py-3 text-[15px]">
        <PlusIcon size={18} />
        Add your first pet
      </Link>
    </div>
  )
}
