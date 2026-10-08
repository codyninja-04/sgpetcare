import { NextResponse } from 'next/server'
import { cleanBody, isUuid, jsonError, requireUser } from '@/lib/api'
import { claudeConfigured } from '@/lib/claude/client'
import { interpretVetNotes, type NotesImage } from '@/lib/claude/vet-note-interpreter'
import { ageYears } from '@/lib/dates'
import { LIMIT_MESSAGES, getUsage } from '@/lib/plan'
import { speciesLabel, type Pet } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * POST multipart: pet_id, and notes text and/or a photo of the notes.
 * Returns the explanation only. Saving it onto a record is the form's job, so
 * the owner can read it before deciding to keep it.
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  if (!claudeConfigured()) return jsonError('Note interpretation is not set up on this server yet.', 503)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonError('Send the notes as a form')
  }

  const petId = form.get('pet_id')
  if (!isUuid(petId)) return jsonError('Say which pet these notes are for')

  const text = cleanBody(form.get('text'), 12_000)
  const file = form.get('image')
  let image: NotesImage | null = null

  if (file instanceof File && file.size > 0) {
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return jsonError('The photo needs to be a JPG, PNG or WebP.')
    if (file.size > MAX_IMAGE_BYTES) return jsonError('That photo is too large. Try a closer, smaller shot.')
    image = { mediaType: file.type as NotesImage['mediaType'], base64: Buffer.from(await file.arrayBuffer()).toString('base64') }
  }

  if (!text && !image) return jsonError('Paste the notes or add a photo of them first.')
  if (text && text.length < 8 && !image) return jsonError('That is a bit short to explain. Paste the full notes.')

  const [{ data: pet }, usage] = await Promise.all([
    supabase.from('pets').select('name, species, breed, date_of_birth, weight_kg').eq('id', petId).maybeSingle(),
    getUsage(supabase, user.id),
  ])
  if (!pet) return jsonError('Pet not found', 404)
  if (!usage.canInterpret) return jsonError(LIMIT_MESSAGES.interpret, 402)

  const p = pet as Pick<Pet, 'name' | 'species' | 'breed' | 'date_of_birth' | 'weight_kg'>

  try {
    const result = await interpretVetNotes(
      { text, image },
      { name: p.name, species: speciesLabel(p.species).toLowerCase(), breed: p.breed, age_years: ageYears(p.date_of_birth), weight_kg: p.weight_kg }
    )
    return NextResponse.json({ result })
  } catch (err) {
    console.error('vet note interpretation failed', err)
    return jsonError('Could not explain those notes just now. Try again in a moment.', 502)
  }
}
