'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react'
import { downscaleImage } from '@/lib/image'
import type { Urgency, VetNoteInterpretation } from '@/lib/types'
import { AlertIcon, CameraIcon, CheckIcon, SparkleIcon, XIcon } from '@/components/ui/Icons'
import { Disclaimer } from './Disclaimer'
import type { VetNotesState } from './VetVisitForm'

const URGENCY: Record<Urgency, { label: string; cls: string; icon: typeof AlertIcon }> = {
  urgent: { label: 'Talk to your vet soon', cls: 'border-expired/25 bg-expired/5 text-expired', icon: AlertIcon },
  follow_up: { label: 'Something to follow up', cls: 'border-expiring/25 bg-expiring/5 text-expiring', icon: AlertIcon },
  routine: { label: 'Nothing flagged', cls: 'border-valid/25 bg-valid/5 text-valid', icon: CheckIcon },
}

const LOADING_LINES = ['Reading the notes...', 'Expanding the vet shorthand...', 'Writing it up in plain English...']

/**
 * Paste the notes or snap the discharge sheet, then get them back in normal
 * words. The result is held in the parent form so it saves with the record.
 */
export function VetNoteInterpreter({
  petId,
  petName,
  notes,
  onChange,
  canInterpret,
}: {
  petId: string
  petName: string
  notes: VetNotesState
  onChange: (n: VetNotesState) => void
  canInterpret: boolean
}) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [line, setLine] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  useEffect(() => {
    if (!busy) return
    setLine(0)
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 2600)
    return () => clearInterval(t)
  }, [busy])

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('That needs to be a photo.')
    setError(null)
    setPhoto(file)
  }

  async function interpret() {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set('pet_id', petId)
      if (notes.original.trim()) body.set('text', notes.original)
      if (photo) body.set('image', await downscaleImage(photo), 'notes.jpg')

      const res = await fetch('/api/vet-notes/interpret', { method: 'POST', body })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not explain those notes. Try again.')

      const result = json.result as VetNoteInterpretation
      onChange({
        original: result.transcription && !notes.original.trim() ? result.transcription : notes.original || result.transcription || '',
        plain: result.plain_english_summary,
        keyPoints: result.key_points,
        followUp: result.follow_up_needed,
        urgency: result.urgency,
      })
      setPhoto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not explain those notes. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const canSend = Boolean(notes.original.trim() || photo) && !busy
  const u = notes.urgency ? URGENCY[notes.urgency] : null

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="label mb-0" htmlFor="vet-notes">
            Vet notes or discharge summary
          </label>
          <p className="hint mt-0.5">Type them in, or snap a photo of the sheet.</p>
        </div>
        <button type="button" onClick={() => fileInput.current?.click()} className="btn-secondary shrink-0 px-3 py-2 text-[13px]">
          <CameraIcon size={15} />
          {photo ? 'Retake' : 'Photo'}
        </button>
        <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
      </div>

      {preview && (
        <div className="relative w-fit">
          <img src={preview} alt="Photo of the vet notes" className="max-h-44 rounded-xl border border-border object-contain" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-border bg-surface text-muted shadow-card hover:text-expired"
            aria-label="Remove photo"
          >
            <XIcon size={13} />
          </button>
        </div>
      )}

      <textarea
        id="vet-notes"
        className="textarea min-h-[120px] font-mono text-[13px]"
        value={notes.original}
        onChange={(e) => onChange({ ...notes, original: e.target.value })}
        placeholder={'e.g. PE: T 39.4, HR 120, mild dehydration. Dx: AGE.\nRx: Metronidazole 250mg 1/2 tab PO BID x 5d. Recheck 1 wk if not better.'}
        maxLength={12000}
      />

      {canInterpret ? (
        <button type="button" onClick={interpret} disabled={!canSend} className="btn-primary w-full sm:w-auto">
          <SparkleIcon size={16} />
          {busy ? LOADING_LINES[line] : notes.plain ? 'Explain again' : 'Explain in plain English'}
        </button>
      ) : (
        <p className="rounded-xl border border-dashed border-primary/30 bg-primary-soft/40 px-3.5 py-3 text-[13px] text-primary-ink">
          Plain English explanations of vet notes are part of Pro. The notes still save with the record.
        </p>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-expired">
          {error}
        </p>
      )}

      {busy && (
        <div className="space-y-2 pt-1" aria-hidden>
          <div className="skeleton h-3.5 w-11/12" />
          <div className="skeleton h-3.5 w-4/5" />
          <div className="skeleton h-3.5 w-2/3" />
        </div>
      )}

      {notes.plain && !busy && (
        <div className="animate-rise-in space-y-3 rounded-xl border border-primary/15 bg-primary-soft/30 p-4">
          <p className="eyebrow flex items-center gap-1.5 text-primary-ink">
            <SparkleIcon size={12} /> What this means for {petName}
          </p>
          <div className="space-y-2.5 text-[14px] leading-relaxed">
            {notes.plain.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {notes.keyPoints.length > 0 && (
            <ul className="space-y-1.5 border-t border-primary/10 pt-3 text-[14px]">
              {notes.keyPoints.map((p, i) => (
                <li key={i} className="flex gap-2.5 leading-relaxed">
                  <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ul>
          )}

          {u && (
            <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] ${u.cls}`}>
              <u.icon size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{u.label}</p>
                {notes.followUp && <p className="mt-0.5 leading-relaxed text-text">{notes.followUp}</p>}
                {notes.urgency === 'urgent' && (
                  <p className="mt-1 leading-relaxed text-text">If your pet seems worse right now, call your vet or a 24 hour emergency clinic.</p>
                )}
              </div>
            </div>
          )}

          <Disclaimer />
        </div>
      )}
    </div>
  )
}
