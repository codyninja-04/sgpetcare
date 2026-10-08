'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { addMonthsISO, addDaysISO, formatDate, todayISO } from '@/lib/dates'
import { NAME_FIELD, PARASITE_PRODUCTS, VACCINES, suggestNextDue } from '@/lib/health'
import { DOCUMENT_BUCKET, fileProblem, uploadFile } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'
import { RECORD_TYPES, type HealthRecordView, type RecordType, type Species, type Urgency } from '@/lib/types'
import { FileIcon, XIcon } from '@/components/ui/Icons'

export interface VetNotesState {
  original: string
  plain: string | null
  keyPoints: string[]
  followUp: string | null
  urgency: Urgency | null
}

interface FormState {
  record_type: RecordType
  record_date: string
  vaccine_name: string
  next_due_date: string
  nextTouched: boolean
  vet_clinic: string
  cost: string
  notes: string
}

const QUICK_GAPS = [
  { label: '2 wks', apply: (d: string) => addDaysISO(d, 14) },
  { label: '1 mth', apply: (d: string) => addMonthsISO(d, 1) },
  { label: '3 mths', apply: (d: string) => addMonthsISO(d, 3) },
  { label: '6 mths', apply: (d: string) => addMonthsISO(d, 6) },
  { label: '1 yr', apply: (d: string) => addMonthsISO(d, 12) },
  { label: '3 yrs', apply: (d: string) => addMonthsISO(d, 36) },
]

export function VetVisitForm({
  petId,
  species,
  record,
  canUploadDocuments,
  renderVetNotes,
  onDone,
}: {
  petId: string
  species: Species | null
  record?: HealthRecordView
  canUploadDocuments: boolean
  /** The plain English interpreter slots in here for vet visits and surgery. */
  renderVetNotes?: (notes: VetNotesState, setNotes: (n: VetNotesState) => void) => React.ReactNode
  onDone: () => void
}) {
  const router = useRouter()
  const editing = Boolean(record)
  const fileInput = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(() => ({
    record_type: record?.record_type ?? 'vaccination',
    record_date: record?.record_date ?? todayISO(),
    vaccine_name: record?.vaccine_name ?? '',
    next_due_date: record?.next_due_date ?? (record ? '' : suggestNextDue('vaccination', todayISO()) ?? ''),
    nextTouched: Boolean(record),
    vet_clinic: record?.vet_clinic ?? '',
    cost: record?.cost != null ? String(record.cost) : '',
    notes: record?.notes ?? '',
  }))
  const [vetNotes, setVetNotes] = useState<VetNotesState>(() => ({
    original: record?.vet_notes_original ?? '',
    plain: record?.vet_notes_plain_english ?? null,
    keyPoints: record?.vet_notes_key_points ?? [],
    followUp: record?.vet_notes_follow_up ?? null,
    urgency: record?.vet_notes_urgency ?? null,
  }))
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docRemoved, setDocRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Until the owner picks a due date themselves, keep the suggestion in step
  // with the type and date, so a deworming logged last month lands 3 months on.
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (!next.nextTouched && (key === 'record_type' || key === 'record_date')) {
        next.next_due_date = suggestNextDue(next.record_type, next.record_date) ?? ''
      }
      return next
    })
  }

  const nameField = NAME_FIELD[form.record_type]
  const nameOptions =
    form.record_type === 'vaccination' ? VACCINES[species ?? 'other'] ?? [] : form.record_type === 'deworming' || form.record_type === 'medication' ? PARASITE_PRODUCTS : []
  const showsVetNotes = form.record_type === 'vet_visit' || form.record_type === 'surgery'
  const hasExistingDoc = Boolean(record?.document_url) && !docRemoved && !docFile

  function pickDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = fileProblem(file, { allowPdf: true })
    if (problem) return setError(problem)
    setError(null)
    setDocFile(file)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let document_url: string | null | undefined
      if (docFile) {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Your session ended. Sign in again.')
        document_url = await uploadFile(supabase, user.id, DOCUMENT_BUCKET, docFile)
      } else if (docRemoved) {
        document_url = null
      }

      const payload: Record<string, unknown> = {
        pet_id: petId,
        record_type: form.record_type,
        record_date: form.record_date,
        vaccine_name: nameField ? form.vaccine_name : null,
        next_due_date: form.next_due_date || null,
        vet_clinic: form.vet_clinic,
        cost: form.cost,
        notes: form.notes,
        vet_notes_original: showsVetNotes ? vetNotes.original : null,
        vet_notes_plain_english: showsVetNotes ? vetNotes.plain : null,
        vet_notes_key_points: showsVetNotes ? vetNotes.keyPoints : [],
        vet_notes_follow_up: showsVetNotes ? vetNotes.followUp : null,
        vet_notes_urgency: showsVetNotes ? vetNotes.urgency : null,
      }
      if (document_url !== undefined) payload.document_url = document_url

      const res = await fetch(editing ? `/api/health-records/${record!.id}` : '/api/health-records', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not save. Try again.')

      router.refresh()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <span className="label">What was it?</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Record type">
          {RECORD_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={form.record_type === t.value}
              onClick={() => update('record_type', t.value)}
              className={`chip justify-center px-2 py-2 text-[12px] ${form.record_type === t.value ? 'chip-on' : ''}`}
            >
              {t.short}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="record-date">
            Date
          </label>
          <input
            id="record-date"
            type="date"
            className="input"
            value={form.record_date}
            max={addDaysISO(todayISO(), 1)}
            onChange={(e) => update('record_date', e.target.value)}
            required
          />
        </div>
        {nameField && (
          <div>
            <label className="label" htmlFor="record-name">
              {nameField.label}
            </label>
            <input
              id="record-name"
              className="input"
              list="record-name-list"
              value={form.vaccine_name}
              onChange={(e) => update('vaccine_name', e.target.value)}
              placeholder={nameField.placeholder}
              maxLength={80}
            />
            <datalist id="record-name-list">
              {nameOptions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-subtle/60 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="label" htmlFor="next-due">
              Next due
            </label>
            <input
              id="next-due"
              type="date"
              className="input"
              value={form.next_due_date}
              min={form.record_date ? addDaysISO(form.record_date, 1) : undefined}
              onChange={(e) => setForm((f) => ({ ...f, next_due_date: e.target.value, nextTouched: true }))}
            />
          </div>
          {form.next_due_date && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, next_due_date: '', nextTouched: true }))} className="btn-ghost px-3 py-2.5 text-[13px]">
              No reminder
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_GAPS.map((g) => (
            <button
              key={g.label}
              type="button"
              disabled={!form.record_date}
              onClick={() => setForm((f) => ({ ...f, next_due_date: g.apply(f.record_date), nextTouched: true }))}
              className="chip px-2.5 py-1 text-[12px]"
            >
              +{g.label}
            </button>
          ))}
        </div>
        <p className="hint">
          {form.next_due_date
            ? `We will remind you before ${formatDate(form.next_due_date)}.${
                form.record_type === 'vaccination' ? ' Puppies and kittens usually need boosters every 3 to 4 weeks, so check the booklet.' : ''
              }`
            : 'Leave empty if there is nothing to follow up.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label" htmlFor="clinic">
            Vet clinic
          </label>
          <input id="clinic" className="input" value={form.vet_clinic} onChange={(e) => update('vet_clinic', e.target.value)} placeholder="Clinic name" maxLength={100} />
        </div>
        <div>
          <label className="label" htmlFor="cost">
            Cost (S$)
          </label>
          <input
            id="cost"
            className="input"
            inputMode="decimal"
            value={form.cost}
            onChange={(e) => update('cost', e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0"
          />
        </div>
      </div>

      {showsVetNotes && renderVetNotes ? (
        renderVetNotes(vetNotes, setVetNotes)
      ) : showsVetNotes ? (
        <div>
          <label className="label" htmlFor="vet-notes">
            Vet notes or discharge summary
          </label>
          <textarea
            id="vet-notes"
            className="textarea"
            value={vetNotes.original}
            onChange={(e) => setVetNotes({ ...vetNotes, original: e.target.value })}
            placeholder="Copy what the vet wrote, word for word"
            maxLength={12000}
          />
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="record-notes">
          Your notes
        </label>
        <textarea
          id="record-notes"
          className="textarea min-h-[80px]"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Reaction afterwards, what the vet said at the counter, batch number"
          maxLength={4000}
        />
      </div>

      <div>
        <span className="label">Document</span>
        {docFile || hasExistingDoc ? (
          <div className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-[14px]">
            <FileIcon size={18} className="text-primary" />
            <span className="min-w-0 flex-1 truncate">{docFile ? docFile.name : 'Document attached'}</span>
            <button
              type="button"
              onClick={() => {
                setDocFile(null)
                setDocRemoved(true)
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-expired"
              aria-label="Remove document"
            >
              <XIcon size={14} />
            </button>
          </div>
        ) : canUploadDocuments ? (
          <button type="button" onClick={() => fileInput.current?.click()} className="btn-secondary w-full border-dashed">
            <FileIcon size={16} />
            Attach a photo or PDF of the invoice, certificate or report
          </button>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-[13px] text-muted">Keeping document photos is part of Pro.</p>
        )}
        <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={pickDoc} />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-expired/20 bg-expired/5 px-3.5 py-2.5 text-[13px] text-expired">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={saving || !form.record_date} className="btn-primary px-6">
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Save record'}
        </button>
      </div>
    </form>
  )
}
