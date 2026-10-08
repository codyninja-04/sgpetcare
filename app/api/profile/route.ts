import { NextResponse } from 'next/server'
import { cleanText, jsonError, readJson, requireUser } from '@/lib/api'

const LEAD_DAYS = [3, 7, 14, 30] as const

/** Reminder preferences and display name. The plan is never set from here. */
export async function PATCH(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await readJson(req)
  if (!body) return jsonError('That request was not valid JSON')

  const update: Record<string, unknown> = {}
  if (typeof body.email_reminders === 'boolean') update.email_reminders = body.email_reminders
  if (typeof body.push_reminders === 'boolean') update.push_reminders = body.push_reminders
  if ('reminder_lead_days' in body) {
    if (!(LEAD_DAYS as readonly unknown[]).includes(body.reminder_lead_days)) return jsonError('Pick one of the lead times.')
    update.reminder_lead_days = body.reminder_lead_days
  }
  if ('display_name' in body) update.display_name = cleanText(body.display_name, 60)
  if (Object.keys(update).length === 0) return jsonError('Nothing to update')

  // Upsert covers accounts created before the profile trigger existed.
  const { data, error } = await auth.supabase
    .from('profiles')
    .upsert({ id: auth.user.id, email: auth.user.email, ...update }, { onConflict: 'id' })
    .select('email_reminders, push_reminders, reminder_lead_days, display_name')
    .single()
  if (error) return jsonError('Could not save your settings', 500)
  return NextResponse.json({ profile: data })
}
