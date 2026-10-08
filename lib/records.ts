import type { SupabaseClient } from '@supabase/supabase-js'
import { signMany } from './storage'
import type { HealthRecord, HealthRecordView } from './types'

export async function listRecords(supabase: SupabaseClient, petId: string, limit?: number): Promise<HealthRecordView[]> {
  let query = supabase
    .from('health_records')
    .select('*')
    .eq('pet_id', petId)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)

  const { data } = await query
  const records = (data ?? []) as HealthRecord[]
  const signed = await signMany(
    supabase,
    records.map((r) => r.document_url)
  )
  return records.map((r) => ({ ...r, document: r.document_url ? signed.get(r.document_url) ?? null : null }))
}
