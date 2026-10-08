import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Sidebar, type NavPet } from '@/components/layout/Sidebar'
import { todayISO } from '@/lib/dates'
import { licenseStatus } from '@/lib/license'
import { listPets } from '@/lib/pets'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [pets, overdueRes] = await Promise.all([
    listPets(supabase),
    supabase.from('reminders').select('pet_id').eq('is_completed', false).lt('due_date', todayISO()),
  ])

  const overdue = new Set((overdueRes.data ?? []).map((r) => r.pet_id as string))
  const nav: NavPet[] = pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    photo: p.photo,
    alert: overdue.has(p.id) || licenseStatus(p).state === 'expired',
  }))
  const email = user.email ?? null

  return (
    <div className="flex min-h-screen">
      <Sidebar pets={nav} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header pets={nav} email={email} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</main>
      </div>
    </div>
  )
}
