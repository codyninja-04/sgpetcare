import type { SupabaseClient } from '@supabase/supabase-js'
import { daysUntil, todayISO } from './dates'
import type { HealthRecord, Pet, RecordType, Reminder, ReminderType } from './types'

const TYPE_FOR_RECORD: Partial<Record<RecordType, ReminderType>> = {
  vaccination: 'vaccination_due',
  deworming: 'deworming_due',
  vet_visit: 'checkup_due',
  medication: 'checkup_due',
  surgery: 'checkup_due',
  grooming: 'checkup_due',
}

export function reminderLabelForRecord(record: Pick<HealthRecord, 'record_type' | 'vaccine_name'>): string {
  switch (record.record_type) {
    case 'vaccination':
      return record.vaccine_name ? `${record.vaccine_name} booster` : 'Vaccination booster'
    case 'deworming':
      return record.vaccine_name ? `${record.vaccine_name} (deworming)` : 'Deworming'
    case 'medication':
      return record.vaccine_name ? `${record.vaccine_name} refill` : 'Medication refill'
    case 'grooming':
      return 'Grooming'
    case 'surgery':
      return 'Post surgery review'
    default:
      return 'Vet check up'
  }
}

/**
 * One open reminder per record. Saving a record replaces its reminder, and a
 * newer record of the same kind (same vaccine, or any deworming) closes the
 * older open ones, because the booster you just logged is the one they were
 * nagging about.
 */
export async function syncRecordReminder(supabase: SupabaseClient, record: HealthRecord): Promise<void> {
  const type = TYPE_FOR_RECORD[record.record_type]
  if (!type) return

  await supabase.from('reminders').delete().eq('health_record_id', record.id).eq('is_completed', false)

  const { data: older } = await supabase
    .from('health_records')
    .select('id, vaccine_name, record_date')
    .eq('pet_id', record.pet_id)
    .eq('record_type', record.record_type)
    .neq('id', record.id)
    .lte('record_date', record.record_date)

  const supersedes = (older ?? []).filter((r) =>
    record.record_type === 'vaccination' || record.record_type === 'medication'
      ? sameName(r.vaccine_name, record.vaccine_name)
      : true
  )
  if (supersedes.length) {
    await supabase
      .from('reminders')
      .update({ is_completed: true })
      .in('health_record_id', supersedes.map((r) => r.id))
      .eq('is_completed', false)
  }

  if (!record.next_due_date) return
  await supabase.from('reminders').insert({
    pet_id: record.pet_id,
    health_record_id: record.id,
    reminder_type: type,
    label: reminderLabelForRecord(record),
    due_date: record.next_due_date,
    // Due dates already in the past were usually typed in from an old booklet.
    // Leave them visible as overdue but do not fire an email about them.
    reminder_sent: daysUntil(record.next_due_date) < -1,
  })
}

/** The licence has a single rolling reminder per pet, rebuilt whenever the expiry changes. */
export async function syncLicenseReminder(supabase: SupabaseClient, pet: Pick<Pet, 'id' | 'license_expiry'>): Promise<void> {
  const { data: open } = await supabase
    .from('reminders')
    .select('id, due_date')
    .eq('pet_id', pet.id)
    .eq('reminder_type', 'license_renewal')
    .eq('is_completed', false)

  const current = open?.[0]
  if (current && current.due_date === pet.license_expiry && open?.length === 1) return

  if (open?.length) {
    await supabase.from('reminders').delete().in('id', open.map((r) => r.id))
  }
  if (!pet.license_expiry) return

  await supabase.from('reminders').insert({
    pet_id: pet.id,
    reminder_type: 'license_renewal',
    label: 'AVS licence renewal',
    due_date: pet.license_expiry,
    reminder_sent: pet.license_expiry < todayISO(),
  })
}

function sameName(a: string | null, b: string | null): boolean {
  const norm = (s: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return norm(a) === norm(b)
}

export type UpcomingReminder = Reminder & { pet: { id: string; name: string; species: Pet['species'] } }

/** Open reminders across every pet the user owns, soonest first. RLS scopes it. */
export async function listUpcoming(supabase: SupabaseClient, opts: { petId?: string; limit?: number } = {}): Promise<UpcomingReminder[]> {
  let query = supabase
    .from('reminders')
    .select('*, pet:pets(id, name, species)')
    .eq('is_completed', false)
    .order('due_date', { ascending: true })
    .limit(opts.limit ?? 20)
  if (opts.petId) query = query.eq('pet_id', opts.petId)
  const { data } = await query
  return (data ?? []) as UpcomingReminder[]
}
