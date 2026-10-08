import { cleanBody, cleanDate, cleanNumber, cleanText, pick } from './api'
import { addDaysISO, todayISO } from './dates'
import { DOCUMENT_BUCKET, ownsReference } from './storage'
import type { HealthRecord, RecordType, Urgency } from './types'

const TYPES: readonly RecordType[] = ['vaccination', 'deworming', 'vet_visit', 'surgery', 'medication', 'grooming']
const URGENCY: readonly Urgency[] = ['routine', 'follow_up', 'urgent']

export type RecordInput = Partial<
  Pick<
    HealthRecord,
    | 'record_type'
    | 'record_date'
    | 'vaccine_name'
    | 'next_due_date'
    | 'vet_clinic'
    | 'cost'
    | 'notes'
    | 'vet_notes_original'
    | 'vet_notes_plain_english'
    | 'vet_notes_key_points'
    | 'vet_notes_follow_up'
    | 'vet_notes_urgency'
    | 'document_url'
  >
>

/** Only keys present in the body come back, so PATCH leaves the rest alone. */
export function parseRecordInput(
  body: Record<string, unknown>,
  userId: string,
  existing?: Pick<HealthRecord, 'record_date' | 'next_due_date'>
): { input: RecordInput; error?: string } {
  const input: RecordInput = {}
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)

  if (has('record_type')) {
    const t = pick(body.record_type, TYPES)
    if (!t) return { input, error: 'Pick what kind of record this is.' }
    input.record_type = t
  }
  if (has('record_date')) {
    const d = cleanDate(body.record_date)
    if (!d) return { input, error: 'Add the date it happened.' }
    if (d > addDaysISO(todayISO(), 1)) return { input, error: 'The record date is in the future. Use the next due date for upcoming ones.' }
    input.record_date = d
  }
  if (has('next_due_date')) {
    if (body.next_due_date && !cleanDate(body.next_due_date)) return { input, error: 'That next due date does not look right.' }
    input.next_due_date = cleanDate(body.next_due_date)
  }

  const recordDate = input.record_date ?? existing?.record_date
  const nextDue = 'next_due_date' in input ? input.next_due_date : existing?.next_due_date
  if (recordDate && nextDue && nextDue <= recordDate) return { input, error: 'The next due date should be after the record date.' }

  if (has('vaccine_name')) input.vaccine_name = cleanText(body.vaccine_name, 80)
  if (has('vet_clinic')) input.vet_clinic = cleanText(body.vet_clinic, 100)
  if (has('cost')) {
    const c = cleanNumber(body.cost, 0, 100_000)
    if (body.cost !== '' && body.cost !== null && body.cost !== undefined && c === null) return { input, error: 'Cost should be a number in dollars.' }
    input.cost = c
  }
  if (has('notes')) input.notes = cleanBody(body.notes, 4000)
  if (has('vet_notes_original')) input.vet_notes_original = cleanBody(body.vet_notes_original, 12_000)
  if (has('vet_notes_plain_english')) input.vet_notes_plain_english = cleanBody(body.vet_notes_plain_english, 6000)
  if (has('vet_notes_key_points')) {
    const list = Array.isArray(body.vet_notes_key_points) ? body.vet_notes_key_points : []
    const points = list.map((p) => cleanText(p, 400)).filter((p): p is string => Boolean(p)).slice(0, 10)
    input.vet_notes_key_points = points.length ? points : null
  }
  if (has('vet_notes_follow_up')) input.vet_notes_follow_up = cleanBody(body.vet_notes_follow_up, 1000)
  if (has('vet_notes_urgency')) input.vet_notes_urgency = pick(body.vet_notes_urgency, URGENCY)
  if (has('document_url')) {
    if (body.document_url && !ownsReference(body.document_url, userId, DOCUMENT_BUCKET)) return { input, error: 'That document upload is not valid.' }
    input.document_url = (body.document_url as string) || null
  }

  return { input }
}
