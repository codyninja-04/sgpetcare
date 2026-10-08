import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { addDaysISO, todayISO, daysUntil } from '@/lib/dates'
import { digestHtml, digestSubject, digestText, type DigestItem } from '@/lib/email/reminder'
import { limitsEnforced } from '@/lib/plan'
import { pushConfigured, sendPush, type PushSubscriptionRecord } from '@/lib/push'
import { createServiceClient } from '@/lib/supabase/server'
import { REMINDER_LABELS, type Profile, type ReminderType, type Species } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_LEAD_DAYS = 60

interface Row {
  id: string
  reminder_type: ReminderType
  label: string | null
  due_date: string
  pet: { id: string; name: string; species: Species | null; user_id: string } | null
}

/**
 * Runs once a day from Vercel Cron. Each owner gets one digest covering
 * everything that has entered their lead window, by email and by push, and
 * each reminder is only ever sent once.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = todayISO()

  const { data: rows, error } = await supabase
    .from('reminders')
    .select('id, reminder_type, label, due_date, pet:pets(id, name, species, user_id)')
    .eq('is_completed', false)
    .eq('reminder_sent', false)
    .lte('due_date', addDaysISO(today, MAX_LEAD_DAYS))
    .order('due_date', { ascending: true })
    .limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byUser = new Map<string, Row[]>()
  for (const r of (rows ?? []) as unknown as Row[]) {
    if (!r.pet) continue
    byUser.set(r.pet.user_id, [...(byUser.get(r.pet.user_id) ?? []), r])
  }
  if (byUser.size === 0) return NextResponse.json({ users: 0, sent: 0 })

  const userIds = Array.from(byUser.keys())
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, plan, email_reminders, push_reminders, reminder_lead_days').in('id', userIds),
    supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', userIds),
  ])

  const profileById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]))
  const subsByUser = new Map<string, PushSubscriptionRecord[]>()
  for (const s of subs ?? []) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s])

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const from = process.env.REMINDER_FROM_EMAIL || 'SGPetCare <reminders@sgpetcare.app>'
  const sentIds: string[] = []
  const deadEndpoints: string[] = []
  let emails = 0
  let pushes = 0

  for (const [userId, list] of Array.from(byUser.entries())) {
    const profile = profileById.get(userId)
    if (!profile) continue

    const lead = profile.reminder_lead_days ?? 14
    const free = limitsEnforced() && profile.plan !== 'pro'
    const due = list.filter((r) => daysUntil(r.due_date, today) <= lead && !(free && r.reminder_type === 'license_renewal'))
    if (due.length === 0) continue

    const items: DigestItem[] = due.map((r) => ({
      petId: r.pet!.id,
      petName: r.pet!.name,
      species: r.pet!.species,
      type: r.reminder_type,
      label: r.label,
      dueDate: r.due_date,
    }))

    // Owners who switched both channels off are counted as told, so turning
    // reminders back on later does not unleash a backlog.
    let delivered = !profile.email_reminders && !profile.push_reminders

    if (profile.email_reminders && resend && profile.email) {
      const { error: mailError } = await resend.emails.send({
        from,
        to: profile.email,
        subject: digestSubject(items),
        html: digestHtml(items, profile.display_name),
        text: digestText(items),
      })
      if (!mailError) {
        delivered = true
        emails++
      }
    }

    if (profile.push_reminders && pushConfigured()) {
      const first = items[0]
      const result = await sendPush(subsByUser.get(userId) ?? [], {
        title: items.length === 1 ? `${first.petName}: ${first.label || REMINDER_LABELS[first.type]}` : `${items.length} pet reminders`,
        body: digestSubject(items),
        url: items.length === 1 ? `/pets/${first.petId}` : '/pets',
        tag: 'sgpetcare-digest',
      })
      deadEndpoints.push(...result.dead)
      if (result.sent > 0) {
        delivered = true
        pushes += result.sent
      }
    }

    if (delivered) sentIds.push(...due.map((r) => r.id))
  }

  if (sentIds.length) {
    await supabase.from('reminders').update({ reminder_sent: true, sent_at: new Date().toISOString() }).in('id', sentIds)
  }
  if (deadEndpoints.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints)
  }

  return NextResponse.json({ users: byUser.size, reminders: sentIds.length, emails, pushes })
}
