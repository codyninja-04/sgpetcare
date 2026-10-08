'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { TrashIcon } from '@/components/ui/Icons'

export function DeletePet({ petId, name }: { petId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Could not remove. Try again.')
      setBusy(false)
      return
    }
    router.push('/pets')
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-danger mt-4">
        <TrashIcon size={15} />
        Remove {name}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Remove ${name}?`}>
        <p className="text-sm leading-relaxed text-muted">
          Type <span className="font-semibold text-text">{name}</span> to confirm. Every record for {name} goes with it.
        </p>
        <input className="input mt-4" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={`Type ${name} to confirm`} />
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-expired">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="btn-ghost">
            Keep
          </button>
          <button
            onClick={remove}
            disabled={busy || typed.trim().toLowerCase() !== name.trim().toLowerCase()}
            className="btn bg-expired text-white hover:bg-expired/90"
          >
            {busy ? 'Removing...' : 'Remove for good'}
          </button>
        </div>
      </Modal>
    </>
  )
}
