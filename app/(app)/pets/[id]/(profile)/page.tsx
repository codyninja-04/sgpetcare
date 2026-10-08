import Link from 'next/link'
import { UpcomingList } from '@/components/pets/UpcomingList'
import { formatDate } from '@/lib/dates'
import { loadPet } from '@/lib/pet-loader'
import { listUpcoming } from '@/lib/reminders'
import { createClient } from '@/lib/supabase/server'

export default async function PetOverviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [pet, upcoming] = await Promise.all([loadPet(params.id), listUpcoming(supabase, { petId: params.id, limit: 6 })])
  if (!pet) return null

  const facts = [
    { label: 'Born', value: pet.date_of_birth ? formatDate(pet.date_of_birth) : null },
    { label: 'Weight', value: pet.weight_kg != null ? `${pet.weight_kg} kg` : null },
    { label: 'Microchip', value: pet.microchip_number, mono: true },
    { label: 'Sterilised', value: pet.is_sterilized ? 'Yes' : 'No' },
  ]

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="pet-upcoming">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="pet-upcoming" className="font-display text-lg font-bold tracking-tight">
              Coming up
            </h2>
            <Link href={`/pets/${pet.id}/health`} className="text-[13px] font-semibold text-primary hover:text-primary-ink">
              Add a record
            </Link>
          </div>
          <UpcomingList
            reminders={upcoming}
            showPet={false}
            emptyText={`Nothing scheduled for ${pet.name}. Log a vaccination or deworming with a next due date and it will appear here.`}
          />
        </section>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <h2 className="eyebrow">Details</h2>
          <dl className="mt-3 divide-y divide-border">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
                <dt className="text-muted">{f.label}</dt>
                <dd className={`truncate text-right font-semibold ${f.mono ? 'font-mono text-[13px]' : ''} ${f.value ? '' : 'font-normal text-muted/70'}`}>
                  {f.value || 'Not set'}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {pet.notes && (
          <div className="card p-5">
            <h2 className="eyebrow">Notes</h2>
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed">{pet.notes}</p>
          </div>
        )}
      </aside>
    </div>
  )
}
