import { NextResponse } from 'next/server'
import { isUuid, jsonError, readJson, requireUser } from '@/lib/api'

/** Tick a reminder off, or bring it back. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  if (!isUuid(params.id)) return jsonError('Reminder not found', 404)

  const body = await readJson<{ is_completed?: unknown }>(req)
  if (typeof body?.is_completed !== 'boolean') return jsonError('Say whether it is done')

  const { data, error } = await auth.supabase
    .from('reminders')
    .update({ is_completed: body.is_completed })
    .eq('id', params.id)
    .select('id, is_completed')
    .maybeSingle()

  if (error) return jsonError('Could not update the reminder', 500)
  if (!data) return jsonError('Reminder not found', 404)
  return NextResponse.json({ reminder: data })
}
