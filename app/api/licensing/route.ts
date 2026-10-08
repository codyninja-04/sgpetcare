import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { licenseStatus } from '@/lib/license'
import { parsePetInput } from '@/lib/pet-input'
import { syncLicenseReminder } from '@/lib/reminders'
import type { Pet } from '@/lib/types'

const FIELDS = ['license_number', 'license_expiry', 'is_sterilized', 'microchip_number'] as const

/** Licence status for every pet, worst first. */
export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase.from('pets').select('id, name, species, license_number, license_expiry')
  if (error) return jsonError('Could not load licences', 500)

  const rank = { expired: 0, expiring: 1, missing: 2, valid: 3, not_required: 4 }
  const licences = (data ?? [])
    .map((p) => ({ pet_id: p.id, name: p.name, license_number: p.license_number, license_expiry: p.license_expiry, ...licenseStatus(p) }))
    .sort((a, b) => rank[a.state] - rank[b.state])

  return NextResponse.json({ licences })
}

/** Updates only the licensing fields of one pet and rebuilds its renewal reminder. */
export async function PATCH(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body) return jsonError('That request was not valid JSON')
  if (!isUuid(body.pet_id)) return jsonError('Say which pet')

  const subset: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in body) subset[f] = body[f]

  const { input, error } = parsePetInput(subset, user.id)
  if (error) return jsonError(error)
  if (Object.keys(input).length === 0) return jsonError('Nothing to update')

  const { data, error: updateError } = await supabase.from('pets').update(input).eq('id', body.pet_id).select('*').maybeSingle()
  if (updateError) return jsonError('Could not save the licence', 500)
  if (!data) return jsonError('Pet not found', 404)

  const pet = data as Pet
  await syncLicenseReminder(supabase, pet)
  return NextResponse.json({ pet, status: licenseStatus(pet) })
}
