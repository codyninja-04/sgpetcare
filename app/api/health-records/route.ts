import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { LIMIT_MESSAGES, getUsage } from '@/lib/plan'
import { parseRecordInput } from '@/lib/record-input'
import { syncRecordReminder } from '@/lib/reminders'
import type { HealthRecord } from '@/lib/types'

export async function GET(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const petId = new URL(req.url).searchParams.get('pet_id')
  if (!isUuid(petId)) return jsonError('Say which pet')

  const { data, error } = await auth.supabase
    .from('health_records')
    .select('*')
    .eq('pet_id', petId)
    .order('record_date', { ascending: false })
  if (error) return jsonError('Could not load the records', 500)
  return NextResponse.json({ records: data })
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  const body = await readJson(req)
  if (!body) return jsonError('That request was not valid JSON')
  if (!isUuid(body.pet_id)) return jsonError('Say which pet')

  const { input, error } = parseRecordInput(body, user.id)
  if (error) return jsonError(error)
  if (!input.record_type || !input.record_date) return jsonError('Add the type and date.')

  // RLS would refuse the insert anyway, this just gives a clearer message.
  const { data: pet } = await supabase.from('pets').select('id').eq('id', body.pet_id).maybeSingle()
  if (!pet) return jsonError('Pet not found', 404)

  if (input.document_url) {
    const usage = await getUsage(supabase, user.id)
    if (!usage.canUploadDocuments) return jsonError(LIMIT_MESSAGES.documents, 402)
  }

  const { data, error: insertError } = await supabase
    .from('health_records')
    .insert({ ...input, pet_id: pet.id })
    .select('*')
    .single()
  if (insertError || !data) return jsonError('Could not save the record', 500)

  const record = data as HealthRecord
  await syncRecordReminder(supabase, record)
  return NextResponse.json({ record }, { status: 201 })
}
