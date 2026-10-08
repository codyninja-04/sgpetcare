import { NextResponse } from 'next/server'
import { jsonError, readJson, requireUser } from '@/lib/api'
import { parsePetInput } from '@/lib/pet-input'
import { LIMIT_MESSAGES, getUsage } from '@/lib/plan'
import { syncLicenseReminder } from '@/lib/reminders'
import type { Pet } from '@/lib/types'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase.from('pets').select('*').order('created_at', { ascending: true })
  if (error) return jsonError('Could not load your pets', 500)
  return NextResponse.json({ pets: data })
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body) return jsonError('That request was not valid JSON')

  const { input, error } = parsePetInput(body, user.id)
  if (error) return jsonError(error)
  if (!input.name) return jsonError('Give your pet a name.')

  const usage = await getUsage(supabase, user.id)
  if (!usage.canAddPet) return jsonError(LIMIT_MESSAGES.pets, 402)

  const { data, error: insertError } = await supabase
    .from('pets')
    .insert({ ...input, user_id: user.id })
    .select('*')
    .single()

  if (insertError || !data) return jsonError('Could not save your pet', 500)

  const pet = data as Pet
  await syncLicenseReminder(supabase, pet)
  return NextResponse.json({ pet }, { status: 201 })
}
