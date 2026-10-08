import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DeletePet } from '@/components/pets/DeletePet'
import { PetForm } from '@/components/pets/PetForm'
import { ArrowLeftIcon } from '@/components/ui/Icons'
import { isUuid } from '@/lib/api'
import { getPet } from '@/lib/pets'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Edit pet' }

export default async function EditPetPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) notFound()
  const pet = await getPet(createClient(), params.id)
  if (!pet) notFound()

  return (
    <div className="mx-auto max-w-2xl animate-rise-in">
      <Link href={`/pets/${pet.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-text">
        <ArrowLeftIcon size={15} /> {pet.name}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Edit {pet.name}</h1>
      <div className="mt-8">
        <PetForm pet={pet} />
      </div>
      <div className="mt-12 rounded-2xl border border-expired/20 p-5">
        <h2 className="font-display text-[16px] font-bold tracking-tight">Remove {pet.name}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          This deletes {pet.name}&apos;s health records, reminders and uploaded documents. It cannot be undone.
        </p>
        <DeletePet petId={pet.id} name={pet.name} />
      </div>
    </div>
  )
}
