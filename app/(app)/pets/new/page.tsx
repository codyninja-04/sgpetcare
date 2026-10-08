import Link from 'next/link'
import type { Metadata } from 'next'
import { PetForm } from '@/components/pets/PetForm'
import { ArrowLeftIcon } from '@/components/ui/Icons'
import { ProGate } from '@/components/ui/ProGate'
import { LIMIT_MESSAGES, getUsage } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Add a pet' }

export default async function NewPetPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const usage = await getUsage(supabase, user!.id)

  return (
    <div className="mx-auto max-w-2xl animate-rise-in">
      <Link href="/pets" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-text">
        <ArrowLeftIcon size={15} /> My pets
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Add a pet</h1>
      <p className="mt-2 text-sm text-muted">Only the name is needed now. Everything else can be filled in when you have the booklet handy.</p>
      <div className="mt-8">
        {usage.canAddPet ? <PetForm /> : <ProGate title="One more pet in the family?" body={LIMIT_MESSAGES.pets} />}
      </div>
    </div>
  )
}
