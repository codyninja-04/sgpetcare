import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { parsePetInput } from '@/lib/pet-input'
import { syncLicenseReminder } from '@/lib/reminders'
import { removeFiles } from '@/lib/storage'
import type { Pet } from '@/lib/types'

type Ctx = { params: { id: string } }

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  if (!isUuid(params.id)) return jsonError('Pet not found', 404)

  const { data } = await auth.supabase.from('pets').select('*').eq('id', params.id).maybeSingle()
  if (!data) return jsonError('Pet not found', 404)
  return NextResponse.json({ pet: data })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth
  if (!isUuid(params.id)) return jsonError('Pet not found', 404)

  const body = await readJson(req)
  if (!body) return jsonError('That request was not valid JSON')

  const { input, error } = parsePetInput(body, user.id)
  if (error) return jsonError(error)
  if (Object.keys(input).length === 0) return jsonError('Nothing to update')

  const { data: before } = await supabase.from('pets').select('photo_url').eq('id', params.id).maybeSingle()
  if (!before) return jsonError('Pet not found', 404)

  const { data, error: updateError } = await supabase.from('pets').update(input).eq('id', params.id).select('*').single()
  if (updateError || !data) return jsonError('Could not save the changes', 500)

  const pet = data as Pet
  if ('photo_url' in input && before.photo_url && before.photo_url !== pet.photo_url) {
    await removeFiles(supabase, [before.photo_url])
  }
  if ('license_expiry' in input) await syncLicenseReminder(supabase, pet)

  return NextResponse.json({ pet })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase } = auth
  if (!isUuid(params.id)) return jsonError('Pet not found', 404)

  const { data: pet } = await supabase.from('pets').select('id, photo_url').eq('id', params.id).maybeSingle()
  if (!pet) return jsonError('Pet not found', 404)

  const { data: docs } = await supabase.from('health_records').select('document_url').eq('pet_id', pet.id).not('document_url', 'is', null)

  const { error } = await supabase.from('pets').delete().eq('id', pet.id)
  if (error) return jsonError('Could not remove this pet', 500)

  // Rows cascade in the database. Files do not, so clear them up after.
  await removeFiles(supabase, [pet.photo_url, ...(docs ?? []).map((d) => d.document_url as string)])
  return NextResponse.json({ ok: true })
}
