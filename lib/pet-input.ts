import { cleanBody, cleanDate, cleanNumber, cleanText, pick } from './api'
import { todayISO } from './dates'
import { PHOTO_BUCKET, ownsReference } from './storage'
import type { Pet, Sex, Species } from './types'

const SPECIES: readonly Species[] = ['dog', 'cat', 'rabbit', 'bird', 'other']
const SEXES: readonly Sex[] = ['male', 'female']

export type PetInput = Partial<
  Pick<
    Pet,
    | 'name'
    | 'species'
    | 'breed'
    | 'sex'
    | 'date_of_birth'
    | 'weight_kg'
    | 'microchip_number'
    | 'photo_url'
    | 'license_number'
    | 'license_expiry'
    | 'is_sterilized'
    | 'notes'
  >
>

/**
 * Validates a create or update body. Only keys present in the body come back,
 * so a PATCH that sends just the licence fields leaves everything else alone.
 */
export function parsePetInput(body: Record<string, unknown>, userId: string): { input: PetInput; error?: string } {
  const input: PetInput = {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)

  if (has('name')) {
    const name = cleanText(body.name, 60)
    if (!name) return { input, error: 'Give your pet a name.' }
    input.name = name
  }
  if (has('species')) input.species = pick(body.species, SPECIES)
  if (has('breed')) input.breed = cleanText(body.breed, 80)
  if (has('sex')) input.sex = pick(body.sex, SEXES)

  if (has('date_of_birth')) {
    if (body.date_of_birth && !cleanDate(body.date_of_birth)) return { input, error: 'That birth date does not look right.' }
    const dob = cleanDate(body.date_of_birth)
    if (dob && dob > todayISO()) return { input, error: 'The birth date is in the future.' }
    input.date_of_birth = dob
  }
  if (has('weight_kg')) {
    const w = cleanNumber(body.weight_kg, 0.01, 199)
    if (body.weight_kg !== '' && body.weight_kg !== null && body.weight_kg !== undefined && w === null) {
      return { input, error: 'Weight should be in kg, between 0 and 200.' }
    }
    input.weight_kg = w
  }
  if (has('microchip_number')) {
    const chip = cleanText(body.microchip_number, 32)
    input.microchip_number = chip ? chip.replace(/\s+/g, '') : null
  }
  if (has('photo_url')) {
    if (body.photo_url && !ownsReference(body.photo_url, userId, PHOTO_BUCKET)) return { input, error: 'That photo upload is not valid.' }
    input.photo_url = (body.photo_url as string) || null
  }
  if (has('license_number')) input.license_number = cleanText(body.license_number, 40)
  if (has('license_expiry')) {
    if (body.license_expiry && !cleanDate(body.license_expiry)) return { input, error: 'That licence expiry date does not look right.' }
    input.license_expiry = cleanDate(body.license_expiry)
  }
  if (has('is_sterilized')) input.is_sterilized = body.is_sterilized === true
  if (has('notes')) input.notes = cleanBody(body.notes, 2000)

  return { input }
}
