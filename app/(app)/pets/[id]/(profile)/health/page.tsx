import type { Metadata } from 'next'
import { HealthWorkspace } from '@/components/health/HealthWorkspace'
import { VaccinationTracker } from '@/components/pets/VaccinationTracker'
import { BugIcon } from '@/components/ui/Icons'
import { daysUntil, dueLabel, formatDate, todayISO } from '@/lib/dates'
import { formatMoney } from '@/lib/health'
import { loadPet } from '@/lib/pet-loader'
import { getUsage } from '@/lib/plan'
import { listRecords } from '@/lib/records'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Health' }

export default async function PetHealthPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [pet, records, usage] = await Promise.all([loadPet(params.id), listRecords(supabase, params.id), getUsage(supabase, user!.id)])
  if (!pet) return null

  const lastDeworm = records.find((r) => r.record_type === 'deworming')
  const dewormDays = lastDeworm?.next_due_date ? daysUntil(lastDeworm.next_due_date) : null

  const year = todayISO().slice(0, 4)
  const spentThisYear = records.filter((r) => r.record_date.startsWith(year)).reduce((sum, r) => sum + (r.cost ?? 0), 0)
  const visitsThisYear = records.filter((r) => r.record_date.startsWith(year) && r.record_type === 'vet_visit').length

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="order-2 min-w-0 lg:order-1">
        <HealthWorkspace
          petId={pet.id}
          petName={pet.name}
          species={pet.species}
          records={records}
          canUploadDocuments={usage.canUploadDocuments}
        />
      </div>

      <aside className="order-1 space-y-4 lg:order-2">
        <VaccinationTracker records={records} species={pet.species} petName={pet.name} />

        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <BugIcon size={18} className="text-amber-600" />
            Deworming
          </h2>
          {lastDeworm ? (
            <div className="mt-3 text-[14px]">
              <p className="text-muted">
                Last done <span className="font-semibold text-text">{formatDate(lastDeworm.record_date)}</span>
                {lastDeworm.vaccine_name ? ` with ${lastDeworm.vaccine_name}` : ''}
              </p>
              {dewormDays !== null && (
                <p className={`mt-1.5 font-semibold ${dewormDays < 0 ? 'text-expired' : dewormDays <= 14 ? 'text-expiring' : 'text-valid'}`}>
                  {dueLabel(dewormDays)}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Nothing logged. Most vets here suggest deworming every 3 months, and monthly heartworm prevention for dogs given how many
              mosquitoes we have.
            </p>
          )}
        </div>

        {records.length > 0 && (
          <div className="card grid grid-cols-2 divide-x divide-border p-0">
            <div className="p-4">
              <p className="eyebrow">Spent in {year}</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight">{formatMoney(spentThisYear)}</p>
            </div>
            <div className="p-4">
              <p className="eyebrow">Vet visits</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight">{visitsThisYear}</p>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
