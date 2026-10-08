import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { LIMIT_MESSAGES, getUsage } from '@/lib/plan'
import { parseRecordInput } from '@/lib/record-input'
import { syncRecordReminder } from '@/lib/reminders'
import { removeFiles } from '@/lib/storage'
import type { HealthRecord } from '@/lib/types'

type Ctx = { params: { id: string } }

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth
  if (!isUuid(params.id)) return jsonError('Record not found', 404)

  const body = await readJson(req)
  if (!body) return jsonError('That request was not valid JSON')

  const { data: before } = await supabase
    .from('health_records')
    .select('record_date, next_due_date, document_url')
    .eq('id', params.id)
    .maybeSingle()
  if (!before) return jsonError('Record not found', 404)

  const { input, error } = parseRecordInput(body, user.id, before)
  if (error) return jsonError(error)
  if (Object.keys(input).length === 0) return jsonError('Nothing to update')

  if (input.document_url && input.document_url !== before.document_url) {
    const usage = await getUsage(supabase, user.id)
    if (!usage.canUploadDocuments) return jsonError(LIMIT_MESSAGES.documents, 402)
  }

  const { data, error: updateError } = await supabase.from('health_records').update(input).eq('id', params.id).select('*').single()
  if (updateError || !data) return jsonError('Could not save the changes', 500)

  const record = data as HealthRecord
  if ('document_url' in input && before.document_url && before.document_url !== record.document_url) {
    await removeFiles(supabase, [before.document_url])
  }
  if ('next_due_date' in input || 'record_date' in input || 'vaccine_name' in input || 'record_type' in input) {
    await syncRecordReminder(supabase, record)
  }

  return NextResponse.json({ record })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase } = auth
  if (!isUuid(params.id)) return jsonError('Record not found', 404)

  const { data: record } = await supabase.from('health_records').select('id, document_url').eq('id', params.id).maybeSingle()
  if (!record) return jsonError('Record not found', 404)

  const { error } = await supabase.from('health_records').delete().eq('id', record.id)
  if (error) return jsonError('Could not delete the record', 500)

  await removeFiles(supabase, [record.document_url])
  return NextResponse.json({ ok: true })
}
