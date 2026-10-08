'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'

export function DangerZone() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/account', { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error || 'Could not delete the account.')
      setBusy(false)
      return
    }
    window.location.href = '/'
  }

  return (
    <section className="rounded-2xl border border-expired/20 p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold tracking-tight">Delete account</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Removes every pet, record, reminder, question and uploaded file. If you might need the records for a new vet, copy them out first.
      </p>
      <button onClick={() => setOpen(true)} className="btn-danger mt-4">
        Delete my account
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete everything?">
        <p className="text-sm leading-relaxed text-muted">
          Type <span className="font-semibold text-text">delete</span> to confirm. This cannot be undone.
        </p>
        <input className="input mt-4" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type delete to confirm" />
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-expired">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className="btn-ghost">
            Keep my account
          </button>
          <button onClick={remove} disabled={busy || typed.trim().toLowerCase() !== 'delete'} className="btn bg-expired text-white hover:bg-expired/90">
            {busy ? 'Deleting...' : 'Delete for good'}
          </button>
        </div>
      </Modal>
    </section>
  )
}
