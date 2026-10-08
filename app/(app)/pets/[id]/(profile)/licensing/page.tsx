import type { Metadata } from 'next'
import { LicenseEditor } from '@/components/pets/LicenseEditor'
import { LicensingStatus } from '@/components/pets/LicensingStatus'
import { BellIcon, CheckIcon, HomeIcon } from '@/components/ui/Icons'
import { licenseRequired, licenseStatus } from '@/lib/license'
import { loadPet } from '@/lib/pet-loader'
import { getUsage } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Licensing' }

export default async function PetLicensingPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [pet, usage] = await Promise.all([loadPet(params.id), getUsage(supabase, user!.id)])
  if (!pet) return null

  const status = licenseStatus(pet)
  const required = licenseRequired(pet.species)

  const checklist = [
    { done: Boolean(pet.microchip_number), label: 'Microchip number recorded', hint: 'Dogs need to be microchipped before they can be licensed.' },
    { done: Boolean(pet.license_number), label: 'Licence number recorded', hint: 'It is on your licence email from AVS.' },
    {
      done: status.state === 'valid' || status.state === 'expiring',
      label: 'Expiry date recorded and current',
      hint: 'We remind you before it lapses.',
    },
    {
      done: Boolean(pet.is_sterilized),
      label: 'Sterilised',
      hint: pet.species === 'dog' ? 'Sterilised dogs pay a lower licence fee and can get a longer licence.' : 'Worth noting for the licence application.',
    },
  ]

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <LicensingStatus status={status} licenseNumber={pet.license_number} expiry={pet.license_expiry} petName={pet.name} />
        <LicenseEditor pet={pet} />
      </div>

      <aside className="space-y-4">
        {required && (
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold tracking-tight">Checklist</h2>
            <ul className="mt-3 space-y-3">
              {checklist.map((c) => (
                <li key={c.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      c.done ? 'bg-valid text-white' : 'border-2 border-border bg-surface'
                    }`}
                    aria-hidden
                  >
                    {c.done && <CheckIcon size={12} strokeWidth={3} />}
                  </span>
                  <div>
                    <p className={`text-[14px] font-semibold ${c.done ? '' : 'text-text'}`}>
                      {c.label}
                      <span className="sr-only">{c.done ? ', done' : ', not yet'}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{c.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <BellIcon size={18} className="text-primary" />
            Renewal reminder
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {!pet.license_expiry
              ? 'Add the expiry date and we will remind you before it lapses.'
              : usage.licenseReminders
                ? 'You will get an email and a push notification before the expiry date. The lead time is in Settings.'
                : 'Licence renewal reminders are part of Pro. The status here still updates on its own.'}
          </p>
        </div>

        {(pet.species === 'dog' || pet.species === 'cat') && (
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <HomeIcon size={18} className="text-primary" />
              Living in an HDB flat?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              {pet.species === 'dog'
                ? 'HDB flats allow one dog from the HDB approved breed list. Some local mixed breeds can be kept under Project ADORE, which has its own rules on size and sterilisation.'
                : 'Cats are now allowed in HDB flats under the cat management framework, with a cap on how many per flat. They need to be licensed and microchipped.'}{' '}
              Rules change from time to time, so check the latest on the HDB and NParks websites.
            </p>
          </div>
        )}

        <p className="px-1 text-[12px] leading-relaxed text-muted">
          SGPetCare keeps track of your licence. Renewals and applications are done directly with AVS on the NParks website.
        </p>
      </aside>
    </div>
  )
}
