import type { SupabaseClient } from '@supabase/supabase-js'
import { signFile, signMany } from './storage'
import type { Pet, PetView } from './types'

export async function listPets(supabase: SupabaseClient): Promise<PetView[]> {
  const { data } = await supabase.from('pets').select('*').order('created_at', { ascending: true })
  const pets = (data ?? []) as Pet[]
  const signed = await signMany(
    supabase,
    pets.map((p) => p.photo_url)
  )
  return pets.map((p) => ({ ...p, photo: p.photo_url ? signed.get(p.photo_url) ?? null : null }))
}

export async function getPet(supabase: SupabaseClient, id: string): Promise<PetView | null> {
  const { data } = await supabase.from('pets').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const pet = data as Pet
  return { ...pet, photo: await signFile(supabase, pet.photo_url) }
}

/** "Golden Retriever · Male · Sterilised" style summary line. */
export function petMeta(pet: Pick<Pet, 'breed' | 'sex' | 'is_sterilized'>): string {
  return [pet.breed, pet.sex === 'male' ? 'Male' : pet.sex === 'female' ? 'Female' : null, pet.is_sterilized ? 'Sterilised' : null]
    .filter(Boolean)
    .join(' · ')
}
