import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from './types'

export const FREE_PETS = 1
export const PRO_PRICE = '$4'

/**
 * Billing is not wired up yet, so limits are shown but only enforced when
 * ENFORCE_PRO=true. Every gate goes through here so switching them on is one
 * env var.
 */
export function limitsEnforced(): boolean {
  return process.env.ENFORCE_PRO === 'true'
}

export interface Usage {
  plan: Plan
  /** True when this account gets Pro features, either paid or because limits are off. */
  pro: boolean
  pets: number
  canAddPet: boolean
  canInterpret: boolean
  canUploadDocuments: boolean
  licenseReminders: boolean
}

export async function getUsage(supabase: SupabaseClient, userId: string): Promise<Usage> {
  const [profileRes, petsRes] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', userId).maybeSingle(),
    supabase.from('pets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const plan: Plan = profileRes.data?.plan === 'pro' ? 'pro' : 'free'
  const pets = petsRes.count ?? 0
  const pro = plan === 'pro' || !limitsEnforced()

  return {
    plan,
    pro,
    pets,
    canAddPet: pro || pets < FREE_PETS,
    canInterpret: pro,
    canUploadDocuments: pro,
    licenseReminders: pro,
  }
}

export const LIMIT_MESSAGES = {
  pets: `The free plan covers ${FREE_PETS} pet. Pro is ${PRO_PRICE} a month for the whole household.`,
  interpret: 'Plain English vet notes are part of Pro.',
  documents: 'Keeping photos of vet documents is part of Pro.',
}
