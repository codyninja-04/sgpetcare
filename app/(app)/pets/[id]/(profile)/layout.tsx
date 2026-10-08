import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LicenseBadge } from '@/components/pets/LicenseBadge'
import { PetAvatar } from '@/components/pets/PetAvatar'
import { PetTabs } from '@/components/pets/PetTabs'
import { ArrowLeftIcon, PencilIcon } from '@/components/ui/Icons'
import { isUuid } from '@/lib/api'
import { ageLabel } from '@/lib/dates'
import { licenseStatus } from '@/lib/license'
import { loadPet } from '@/lib/pet-loader'
import { petMeta } from '@/lib/pets'
import { speciesLabel } from '@/lib/types'

export default async function PetLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  if (!isUuid(params.id)) notFound()
  const pet = await loadPet(params.id)
  if (!pet) notFound()

  const license = licenseStatus(pet)
  const age = ageLabel(pet.date_of_birth)
  const meta = petMeta(pet)

  return (
    <div className="animate-rise-in">
      <Link href="/pets" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-text">
        <ArrowLeftIcon size={15} /> My pets
      </Link>

      <header className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        <PetAvatar photo={pet.photo} species={pet.species} name={pet.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{pet.name}</h1>
            {license.state !== 'not_required' && <LicenseBadge state={license.state} label={license.label} />}
          </div>
          <p className="mt-1.5 text-[15px] text-muted">
            {[speciesLabel(pet.species), meta, age ? `${age} old` : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link href={`/pets/${pet.id}/edit`} className="btn-secondary self-start sm:self-center">
          <PencilIcon size={15} />
          Edit
        </Link>
      </header>

      <div className="mt-8 border-b border-border">
        <PetTabs petId={pet.id} licenceAlert={license.state === 'expired' || license.state === 'expiring'} />
      </div>

      <div className="pt-8">{children}</div>
    </div>
  )
}
