import { addMonthsISO, daysUntil } from './dates'
import type { HealthRecord, RecordType, Species } from './types'

/**
 * Names people actually see on Singapore vet invoices and booklets. These are
 * suggestions in a datalist, not a fixed list, because every clinic writes
 * them a little differently.
 */
export const VACCINES: Partial<Record<Species, string[]>> = {
  dog: ['DHPPi', 'DHPPi + Lepto', 'Leptospirosis', 'Kennel cough (Bordetella)', 'Rabies (for travel)'],
  cat: ['FVRCP (Tricat)', 'FeLV', 'Rabies (for travel)'],
  rabbit: ['RHDV', 'Myxomatosis (for travel)'],
}

export const PARASITE_PRODUCTS = [
  'Drontal',
  'Milbemax',
  'NexGard Spectra',
  'Bravecto',
  'Simparica Trio',
  'Revolution',
  'Broadline',
  'Heartgard Plus',
]

/** Core vaccine check per species. A miss only prompts a gentle note, never an alarm. */
export const CORE_VACCINE: Partial<Record<Species, { label: string; match: RegExp }>> = {
  dog: { label: 'DHPPi (the core dog vaccine)', match: /dhpp|da2pp|dhlpp|dappv?|[5-8]\s*-?\s*in\s*-?\s*1/i },
  cat: { label: 'FVRCP (the core cat vaccine, often called Tricat)', match: /fvrcp|tricat|f3|panleuk|feline enteritis|[3-4]\s*-?\s*in\s*-?\s*1/i },
}

/** Default gap until the next one, in months. Null means no sensible default. */
export const DEFAULT_INTERVAL_MONTHS: Record<RecordType, number | null> = {
  vaccination: 12,
  deworming: 3,
  medication: 1,
  vet_visit: null,
  surgery: null,
  grooming: null,
}

export function suggestNextDue(type: RecordType, recordDate: string): string | null {
  const months = DEFAULT_INTERVAL_MONTHS[type]
  if (!months || !recordDate) return null
  return addMonthsISO(recordDate, months)
}

export const NAME_FIELD: Partial<Record<RecordType, { label: string; placeholder: string }>> = {
  vaccination: { label: 'Vaccine', placeholder: 'DHPPi' },
  deworming: { label: 'Product', placeholder: 'Drontal' },
  medication: { label: 'Medication', placeholder: 'NexGard Spectra' },
}

export type VaccineState = 'up_to_date' | 'due_soon' | 'overdue' | 'no_due_date'

export interface TrackedVaccine {
  name: string
  lastGiven: string
  nextDue: string | null
  state: VaccineState
  days: number | null
  doses: number
}

/** Latest dose per vaccine, keyed by a loose version of the name so "dhppi" and "DHPPi " group together. */
export function trackVaccines(records: Pick<HealthRecord, 'record_type' | 'vaccine_name' | 'record_date' | 'next_due_date'>[]): TrackedVaccine[] {
  const groups = new Map<string, TrackedVaccine>()
  const sorted = records
    .filter((r) => r.record_type === 'vaccination')
    .sort((a, b) => a.record_date.localeCompare(b.record_date))

  for (const r of sorted) {
    const name = r.vaccine_name?.trim() || 'Vaccination'
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const prev = groups.get(key)
    groups.set(key, {
      name,
      lastGiven: r.record_date,
      nextDue: r.next_due_date,
      state: 'no_due_date',
      days: null,
      doses: (prev?.doses ?? 0) + 1,
    })
  }

  return Array.from(groups.values())
    .map((v) => {
      if (!v.nextDue) return v
      const days = daysUntil(v.nextDue)
      const state: VaccineState = days < 0 ? 'overdue' : days <= 30 ? 'due_soon' : 'up_to_date'
      return { ...v, days, state }
    })
    .sort((a, b) => {
      const rank = { overdue: 0, due_soon: 1, up_to_date: 2, no_due_date: 3 }
      return rank[a.state] - rank[b.state] || (a.nextDue ?? '').localeCompare(b.nextDue ?? '')
    })
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)
}
