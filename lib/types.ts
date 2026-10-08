export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other'
export type Sex = 'male' | 'female'
export type Plan = 'free' | 'pro'

export type RecordType = 'vaccination' | 'deworming' | 'vet_visit' | 'surgery' | 'medication' | 'grooming'
export type ReminderType = 'vaccination_due' | 'license_renewal' | 'deworming_due' | 'checkup_due'
export type Urgency = 'routine' | 'follow_up' | 'urgent'

export interface Pet {
  id: string
  user_id: string
  created_at: string
  name: string
  species: Species | null
  breed: string | null
  sex: Sex | null
  date_of_birth: string | null
  weight_kg: number | null
  microchip_number: string | null
  photo_url: string | null
  license_number: string | null
  license_expiry: string | null
  is_sterilized: boolean | null
  notes: string | null
}

/** A pet with its photo already signed, ready to render. */
export type PetView = Pet & { photo: string | null }

export interface HealthRecord {
  id: string
  pet_id: string
  created_at: string
  record_type: RecordType
  record_date: string
  vaccine_name: string | null
  next_due_date: string | null
  vet_clinic: string | null
  cost: number | null
  notes: string | null
  vet_notes_original: string | null
  vet_notes_plain_english: string | null
  vet_notes_key_points: string[] | null
  vet_notes_follow_up: string | null
  vet_notes_urgency: Urgency | null
  document_url: string | null
}

export type HealthRecordView = HealthRecord & { document: string | null }

export interface Reminder {
  id: string
  pet_id: string
  health_record_id: string | null
  created_at: string
  reminder_type: ReminderType
  label: string | null
  due_date: string
  is_completed: boolean
  reminder_sent: boolean
  sent_at: string | null
}

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  plan: Plan
  email_reminders: boolean
  push_reminders: boolean
  reminder_lead_days: number
}

export interface QaMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  pet_id: string | null
}

export interface VetNoteInterpretation {
  transcription: string | null
  plain_english_summary: string
  key_points: string[]
  follow_up_needed: string | null
  urgency: Urgency
}

export const SPECIES: Array<{ value: Species; label: string; emoji: string }> = [
  { value: 'dog', label: 'Dog', emoji: '🐕' },
  { value: 'cat', label: 'Cat', emoji: '🐈' },
  { value: 'rabbit', label: 'Rabbit', emoji: '🐇' },
  { value: 'bird', label: 'Bird', emoji: '🦜' },
  { value: 'other', label: 'Other', emoji: '🐾' },
]

export function speciesLabel(s: Species | null | undefined): string {
  return SPECIES.find((x) => x.value === s)?.label ?? 'Pet'
}

export function speciesEmoji(s: Species | null | undefined): string {
  return SPECIES.find((x) => x.value === s)?.emoji ?? '🐾'
}

export const RECORD_TYPES: Array<{ value: RecordType; label: string; short: string }> = [
  { value: 'vaccination', label: 'Vaccination', short: 'Vaccine' },
  { value: 'deworming', label: 'Deworming', short: 'Deworm' },
  { value: 'vet_visit', label: 'Vet visit', short: 'Vet visit' },
  { value: 'surgery', label: 'Surgery', short: 'Surgery' },
  { value: 'medication', label: 'Medication', short: 'Meds' },
  { value: 'grooming', label: 'Grooming', short: 'Grooming' },
]

export function recordTypeLabel(t: RecordType): string {
  return RECORD_TYPES.find((x) => x.value === t)?.label ?? t
}

export const REMINDER_LABELS: Record<ReminderType, string> = {
  vaccination_due: 'Vaccination due',
  license_renewal: 'AVS licence renewal',
  deworming_due: 'Deworming due',
  checkup_due: 'Check up due',
}
