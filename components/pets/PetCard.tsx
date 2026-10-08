import Link from 'next/link'
import { ageLabel, dueLabel, daysUntil } from '@/lib/dates'
import { licenseStatus } from '@/lib/license'
import { petMeta } from '@/lib/pets'
import { speciesLabel, type PetView } from '@/lib/types'
import { ChevronRightIcon } from '@/components/ui/Icons'
import { LicenseBadge } from './LicenseBadge'
import { PetAvatar } from './PetAvatar'

export function PetCard({ pet, next }: { pet: PetView; next?: { label: string; due_date: string } | null }) {
  const license = licenseStatus(pet)
  const age = ageLabel(pet.date_of_birth)
  const meta = petMeta(pet) || speciesLabel(pet.species)
  const nextDays = next ? daysUntil(next.due_date) : null

  return (
    <Link
      href={`/pets/${pet.id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
    >
      <div className="flex items-start gap-4">
        <PetAvatar photo={pet.photo} species={pet.species} name={pet.name} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold tracking-tight">{pet.name}</h3>
          <p className="mt-0.5 truncate text-[13px] text-muted">{meta}</p>
          {age && <p className="mt-0.5 text-[13px] text-muted">{age} old</p>}
        </div>
        <ChevronRightIcon size={18} className="mt-1 text-muted/60 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {license.state !== 'not_required' && <LicenseBadge state={license.state} label={license.label} />}
      </div>

      <div className="mt-4 border-t border-dashed border-border pt-3 text-[13px]">
        {next && nextDays !== null ? (
          <p className="flex items-center justify-between gap-3">
            <span className="truncate text-muted">{next.label}</span>
            <span className={`shrink-0 font-semibold ${nextDays < 0 ? 'text-expired' : nextDays <= 14 ? 'text-expiring' : 'text-text'}`}>
              {dueLabel(nextDays)}
            </span>
          </p>
        ) : (
          <p className="text-muted">Nothing due yet</p>
        )}
      </div>
    </Link>
  )
}
