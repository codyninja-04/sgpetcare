'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { addMonthsISO, formatDate, todayISO } from '@/lib/dates'
import type { Pet } from '@/lib/types'
import { CheckIcon } from '@/components/ui/Icons'

/**
 * Edit just the licence details. "I just renewed" rolls the expiry forward
 * from the current one so the owner does not have to work the date out.
 */
export function LicenseEditor({ pet }: { pet: Pick<Pet, 'id' | 'name' | 'license_number' | 'license_expiry' | 'microchip_number' | 'is_sterilized'> }) {
  const router = useRouter()
  const [number, setNumber] = useState(pet.license_number ?? '')
  const [expiry, setExpiry] = useState(pet.license_expiry ?? '')
  const [chip, setChip] = useState(pet.microchip_number ?? '')
  const [sterilised, setSterilised] = useState(Boolean(pet.is_sterilized))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    number !== (pet.license_number ?? '') ||
    expiry !== (pet.license_expiry ?? '') ||
    chip !== (pet.microchip_number ?? '') ||
    sterilised !== Boolean(pet.is_sterilized)

  function renewed(years: number) {
    const base = pet.license_expiry && pet.license_expiry > todayISO() ? pet.license_expiry : todayISO()
    setExpiry(addMonthsISO(base, years * 12))
    setSaved(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch('/api/licensing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: pet.id,
        license_number: number,
        license_expiry: expiry || null,
        microchip_number: chip,
        is_sterilized: sterilised,
      }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return setError(json.error || 'Could not save. Try again.')
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight">Licence details</h2>
        <p className="mt-1 text-[13px] text-muted">Copy these from your licence email or the NParks pet licensing portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="lic-number">
            Licence number
          </label>
          <input
            id="lic-number"
            className="input font-mono text-[14px]"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value)
              setSaved(false)
            }}
            maxLength={40}
          />
        </div>
        <div>
          <label className="label" htmlFor="lic-expiry">
            Expiry date
          </label>
          <input
            id="lic-expiry"
            type="date"
            className="input"
            value={expiry}
            onChange={(e) => {
              setExpiry(e.target.value)
              setSaved(false)
            }}
          />
        </div>
      </div>

      <div className="rounded-xl bg-subtle/60 p-3.5">
        <p className="text-[13px] font-semibold">Just renewed?</p>
        <p className="mt-0.5 text-[12px] text-muted">
          Rolls the expiry forward from {pet.license_expiry && pet.license_expiry > todayISO() ? formatDate(pet.license_expiry) : 'today'}.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={() => renewed(1)} className="chip">
            +1 year
          </button>
          <button type="button" onClick={() => renewed(3)} className="chip">
            +3 years
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="lic-chip">
            Microchip number
          </label>
          <input
            id="lic-chip"
            className="input font-mono text-[14px]"
            inputMode="numeric"
            value={chip}
            onChange={(e) => {
              setChip(e.target.value)
              setSaved(false)
            }}
            maxLength={32}
          />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 sm:mt-[26px]">
          <span className="text-[14px] font-semibold">Sterilised</span>
          <input
            type="checkbox"
            checked={sterilised}
            onChange={(e) => {
              setSterilised(e.target.checked)
              setSaved(false)
            }}
            className="h-5 w-5 accent-[rgb(var(--primary))]"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-expired">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !dirty && (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-valid">
            <CheckIcon size={14} /> Saved
          </span>
        )}
        <button type="submit" disabled={saving || !dirty} className="btn-primary">
          {saving ? 'Saving...' : 'Save licence'}
        </button>
      </div>
    </form>
  )
}
