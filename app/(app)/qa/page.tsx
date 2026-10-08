import type { Metadata } from 'next'
import { QaChat } from '@/components/qa/QaChat'
import { listPets } from '@/lib/pets'
import { createClient } from '@/lib/supabase/server'
import type { QaMessage } from '@/lib/types'

export const metadata: Metadata = { title: 'Ask about pet care' }

export default async function QaPage() {
  const supabase = createClient()
  const [pets, { data }] = await Promise.all([
    listPets(supabase),
    supabase.from('qa_messages').select('id, role, content, created_at, pet_id').order('created_at', { ascending: false }).limit(40),
  ])

  const history = ((data ?? []) as QaMessage[]).reverse()

  return (
    <QaChat
      pets={pets.map((p) => ({ id: p.id, name: p.name, species: p.species, photo: p.photo }))}
      initial={history.map((m) => ({ id: m.id, role: m.role, content: m.content, pet_id: m.pet_id }))}
    />
  )
}
