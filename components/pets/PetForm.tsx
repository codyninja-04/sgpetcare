'use client'

/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { todayISO } from '@/lib/dates'
import { licenseRequired } from '@/lib/license'
import { PHOTO_BUCKET, fileProblem, uploadFile } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'
import { SPECIES, type PetView, type Sex, type Species } from '@/lib/types'
import { CameraIcon, XIcon } from '@/components/ui/Icons'

const BREEDS: Record<Species, string[]> = {
  dog: [
    'Singapore Special',
    'Toy Poodle',
    'Miniature Poodle',
    'Shih Tzu',
    'Maltese',
    'Pomeranian',
    'Chihuahua',
    'Miniature Schnauzer',
    'Jack Russell Terrier',
    'Miniature Dachshund',
    'Corgi',
    'Shiba Inu',
    'French Bulldog',
    'Golden Retriever',
    'Labrador Retriever',
    'Mixed breed',
  ],
  cat: [
    'Domestic Short Hair',
    'Domestic Long Hair',
    'British Shorthair',
    'Ragdoll',
    'Scottish Fold',
    'Persian',
    'Siamese',
    'Bengal',
    'Munchkin',
    'Maine Coon',
  ],
  rabbit: ['Holland Lop', 'Netherland Dwarf', 'Mini Rex', 'Lionhead', 'Mini Lop'],
  bird: ['Budgerigar', 'Cockatiel', 'Lovebird', 'Sun Conure', 'Green Cheek Conure', 'African Grey'],
  other: ['Hamster', 'Guinea pig', 'Chinchilla', 'Tortoise', 'Terrapin'],
}

interface FormState {
  name: string
  species: Species
  breed: string
  sex: Sex | ''
  date_of_birth: string
  weight_kg: string
  microchip_number: string
  is_sterilized: boolean
  license_number: string
  license_expiry: string
  notes: string
}

function initial(pet?: PetView): FormState {
  return {
    name: pet?.name ?? '',
    species: pet?.species ?? 'dog',
    breed: pet?.breed ?? '',
    sex: pet?.sex ?? '',
    date_of_birth: pet?.date_of_birth ?? '',
    weight_kg: pet?.weight_kg != null ? String(pet.weight_kg) : '',
    microchip_number: pet?.microchip_number ?? '',
    is_sterilized: Boolean(pet?.is_sterilized),
    license_number: pet?.license_number ?? '',
    license_expiry: pet?.license_expiry ?? '',
    notes: pet?.notes ?? '',
  }
}

export function PetForm({ pet }: { pet?: PetView }) {
  const router = useRouter()
  const editing = Boolean(pet)
  const [form, setForm] = useState<FormState>(() => initial(pet))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(pet?.photo ?? null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photoFile) return
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const showLicence = licenseRequired(form.species) || Boolean(form.license_number || form.license_expiry)

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = fileProblem(file)
    if (problem) return setError(problem)
    setError(null)
    setPhotoFile(file)
    setPhotoRemoved(false)
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoRemoved(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Give your pet a name.')
    setSaving(true)
    setError(null)

    try {
      let photo_url: string | null | undefined
      if (photoFile) {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Your session ended. Sign in again.')
        photo_url = await uploadFile(supabase, user.id, PHOTO_BUCKET, photoFile)
      } else if (photoRemoved) {
        photo_url = null
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        species: form.species,
        breed: form.breed,
        sex: form.sex || null,
        date_of_birth: form.date_of_birth || null,
        weight_kg: form.weight_kg,
        microchip_number: form.microchip_number,
        is_sterilized: form.is_sterilized,
        license_number: form.license_number,
        license_expiry: form.license_expiry || null,
        notes: form.notes,
      }
      if (photo_url !== undefined) payload.photo_url = photo_url

      const res = await fetch(editing ? `/api/pets/${pet!.id}` : '/api/pets', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save. Try again.')

      router.push(`/pets/${json.pet.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="group relative grid h-28 w-28 place-items-center overflow-hidden rounded-[28px] border-2 border-dashed border-primary/30 bg-primary-soft/50 text-primary transition hover:border-primary/60"
              aria-label={photoPreview ? 'Change photo' : 'Add a photo'}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-[12px] font-semibold">
                  <CameraIcon size={22} />
                  Add photo
                </span>
              )}
            </button>
            {photoPreview && (
              <button type="button" onClick={clearPhoto} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-expired">
                <XIcon size={12} /> Remove
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Mochi" maxLength={60} required />
            </div>
            <div>
              <span className="label">Species</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Species">
                {SPECIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={form.species === s.value}
                    onClick={() => set('species', s.value)}
                    className={`chip ${form.species === s.value ? 'chip-on' : ''}`}
                  >
                    <span aria-hidden>{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">About</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="breed">
              Breed
            </label>
            <input id="breed" className="input" list="breed-list" value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Start typing" maxLength={80} />
            <datalist id="breed-list">
              {BREEDS[form.species].map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <span className="label">Sex</span>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('sex', form.sex === s ? '' : s)}
                  aria-pressed={form.sex === s}
                  className={`chip justify-center py-2.5 ${form.sex === s ? 'chip-on' : ''}`}
                >
                  {s === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="dob">
              Date of birth
            </label>
            <input id="dob" type="date" className="input" value={form.date_of_birth} max={todayISO()} onChange={(e) => set('date_of_birth', e.target.value)} />
            <p className="hint">A rough date is fine if you adopted them.</p>
          </div>
          <div>
            <label className="label" htmlFor="weight">
              Weight (kg)
            </label>
            <input
              id="weight"
              className="input"
              inputMode="decimal"
              value={form.weight_kg}
              onChange={(e) => set('weight_kg', e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="4.2"
            />
          </div>
          <div>
            <label className="label" htmlFor="chip">
              Microchip number
            </label>
            <input
              id="chip"
              className="input font-mono text-[14px]"
              inputMode="numeric"
              value={form.microchip_number}
              onChange={(e) => set('microchip_number', e.target.value)}
              placeholder="15 digits"
              maxLength={32}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 sm:mt-[26px]">
            <span>
              <span className="block text-[14px] font-semibold">Sterilised</span>
              <span className="block text-[12px] text-muted">Affects licence fees and options</span>
            </span>
            <input
              type="checkbox"
              checked={form.is_sterilized}
              onChange={(e) => set('is_sterilized', e.target.checked)}
              className="h-5 w-5 accent-[rgb(var(--primary))]"
            />
          </label>
        </div>
      </section>

      {showLicence && (
        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">AVS licence</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {form.species === 'dog'
                ? 'Every dog in Singapore needs a licence. The details are on your licence email or the NParks pet licensing portal.'
                : form.species === 'cat'
                  ? 'Pet cats need a licence under the cat management framework. You can fill this in later.'
                  : 'Optional for this pet.'}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="licence">
                Licence number
              </label>
              <input id="licence" className="input font-mono text-[14px]" value={form.license_number} onChange={(e) => set('license_number', e.target.value)} maxLength={40} />
            </div>
            <div>
              <label className="label" htmlFor="expiry">
                Expiry date
              </label>
              <input id="expiry" type="date" className="input" value={form.license_expiry} onChange={(e) => set('license_expiry', e.target.value)} />
            </div>
          </div>
        </section>
      )}

      <section className="card p-5 sm:p-6">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="textarea min-h-[96px]"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Allergies, diet, how they behave at the vet, anything a pet sitter should know"
          maxLength={2000}
        />
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-expired/20 bg-expired/5 px-3.5 py-2.5 text-[13px] text-expired">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary px-6">
          {saving ? 'Saving...' : editing ? 'Save changes' : `Add ${form.name.trim() || 'pet'}`}
        </button>
      </div>
    </form>
  )
}
