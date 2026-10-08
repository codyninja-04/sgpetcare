import { daysUntil } from './dates'
import type { Pet, Species } from './types'

export type LicenseState = 'valid' | 'expiring' | 'expired' | 'missing' | 'not_required'

export const EXPIRING_WINDOW_DAYS = 30

/**
 * Dogs have always needed an AVS licence. Pet cats were brought in under the
 * cat management framework from September 2024, so we treat both as required
 * and everything else as optional.
 */
export function licenseRequired(species: Species | null | undefined): boolean {
  return species === 'dog' || species === 'cat'
}

export interface LicenseStatus {
  state: LicenseState
  days: number | null
  label: string
  detail: string
}

export function licenseStatus(pet: Pick<Pet, 'species' | 'license_expiry' | 'license_number'>): LicenseStatus {
  const required = licenseRequired(pet.species)

  if (!pet.license_expiry) {
    if (!required) return { state: 'not_required', days: null, label: 'Not required', detail: 'No AVS licence needed for this pet.' }
    return {
      state: 'missing',
      days: null,
      label: 'Not recorded',
      detail: pet.license_number
        ? 'Add the expiry date so we can remind you before it lapses.'
        : 'Add the licence number and expiry from your AVS licence.',
    }
  }

  const days = daysUntil(pet.license_expiry)
  if (days < 0) {
    return { state: 'expired', days, label: 'Expired', detail: `Expired ${-days} ${-days === 1 ? 'day' : 'days'} ago. Renew it on the AVS licensing portal.` }
  }
  if (days <= EXPIRING_WINDOW_DAYS) {
    return {
      state: 'expiring',
      days,
      label: 'Expiring soon',
      detail: days === 0 ? 'Expires today.' : `Expires in ${days} ${days === 1 ? 'day' : 'days'}.`,
    }
  }
  return { state: 'valid', days, label: 'Valid', detail: `Valid for another ${days} days.` }
}
