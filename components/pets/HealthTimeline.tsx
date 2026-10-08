'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { daysUntil, dueLabel, formatDate, monthYear } from '@/lib/dates'
import { formatMoney } from '@/lib/health'
import { RECORD_TYPES, recordTypeLabel, type HealthRecordView, type RecordType } from '@/lib/types'
import {
  AlertIcon,
  BugIcon,
  FileIcon,
  PencilIcon,
  PillIcon,
  ScissorsIcon,
  SparkleIcon,
  StethoscopeIcon,
  SyringeIcon,
  TrashIcon,
} from '@/components/ui/Icons'

const TYPE_STYLE: Record<RecordType, { icon: typeof SyringeIcon; tile: string }> = {
  vaccination: { icon: SyringeIcon, tile: 'bg-primary-soft text-primary' },
  deworming: { icon: BugIcon, tile: 'bg-amber-100 text-amber-700' },
  vet_visit: { icon: StethoscopeIcon, tile: 'bg-sky-100 text-sky-700' },
  surgery: { icon: ScissorsIcon, tile: 'bg-rose-100 text-rose-700' },
  medication: { icon: PillIcon, tile: 'bg-violet-100 text-violet-700' },
  grooming: { icon: SparkleIcon, tile: 'bg-emerald-100 text-emerald-700' },
}

/**
 * Everything that has happened, newest first and grouped by month. Each entry
 * opens up to show notes, the plain English vet summary and the document.
 */
export function HealthTimeline({
  records,
  onEdit,
  compact = false,
}: {
  records: HealthRecordView[]
  onEdit?: (record: HealthRecordView) => void
  compact?: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<RecordType | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c = new Map<RecordType, number>()
    for (const r of records) c.set(r.record_type, (c.get(r.record_type) ?? 0) + 1)
    return c
  }, [records])

  const visible = filter === 'all' ? records : records.filter((r) => r.record_type === filter)

  const groups = useMemo(() => {
    const out: Array<{ month: string; items: HealthRecordView[] }> = []
    for (const r of visible) {
      const month = monthYear(r.record_date)
      const last = out[out.length - 1]
      if (last && last.month === month) last.items.push(r)
      else out.push({ month, items: [r] })
    }
    return out
  }, [visible])

  async function remove(id: string) {
    if (!window.confirm('Delete this record? Its reminder goes too.')) return
    setDeleting(id)
    const res = await fetch(`/api/health-records/${id}`, { method: 'DELETE' })
    setDeleting(null)
    if (res.ok) router.refresh()
    else window.alert('Could not delete it. Try again.')
  }

  if (records.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        No records yet. Start with the most recent vaccination in the booklet.
      </p>
    )
  }

  return (
    <div>
      {!compact && counts.size > 1 && (
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter records">
          <button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={`chip shrink-0 ${filter === 'all' ? 'chip-on' : ''}`}>
            All <span className="text-[11px] opacity-70">{records.length}</span>
          </button>
          {RECORD_TYPES.filter((t) => counts.has(t.value)).map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={filter === t.value}
              onClick={() => setFilter(t.value)}
              className={`chip shrink-0 ${filter === t.value ? 'chip-on' : ''}`}
            >
              {t.label} <span className="text-[11px] opacity-70">{counts.get(t.value)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.month}>
            {!compact && <h3 className="eyebrow mb-2 pl-1">{g.month}</h3>}
            <ol className="relative space-y-2 before:absolute before:bottom-3 before:left-[31px] before:top-3 before:w-px before:bg-border">
              {g.items.map((r) => {
                const style = TYPE_STYLE[r.record_type]
                const Icon = style.icon
                const expanded = open === r.id
                const detail = Boolean(r.notes || r.vet_notes_plain_english || r.vet_notes_original || r.document || r.vet_clinic)
                const nextDays = r.next_due_date ? daysUntil(r.next_due_date) : null
                const title = r.vaccine_name ? `${recordTypeLabel(r.record_type)}: ${r.vaccine_name}` : recordTypeLabel(r.record_type)

                return (
                  <li key={r.id} className="relative">
                    <div className={`card overflow-hidden transition ${expanded ? 'shadow-lift' : ''}`}>
                      <button
                        type="button"
                        onClick={() => setOpen(expanded ? null : r.id)}
                        aria-expanded={expanded}
                        disabled={!detail && !onEdit}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left"
                      >
                        <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.tile}`}>
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-semibold">{title}</span>
                            {r.vet_notes_urgency === 'urgent' && <AlertIcon size={14} className="shrink-0 text-expired" />}
                            {r.vet_notes_plain_english && r.vet_notes_urgency !== 'urgent' && (
                              <SparkleIcon size={13} className="shrink-0 text-primary" aria-label="Has a plain English summary" />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted">
                            {[formatDate(r.record_date), r.vet_clinic, r.cost != null ? formatMoney(r.cost) : null].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        {nextDays !== null && !compact && (
                          <span
                            className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline ${
                              nextDays < 0 ? 'bg-expired/10 text-expired' : nextDays <= 30 ? 'bg-expiring/10 text-expiring' : 'bg-subtle text-muted'
                            }`}
                          >
                            Next: {dueLabel(nextDays).replace(/^Due /, '')}
                          </span>
                        )}
                      </button>

                      {expanded && (
                        <div className="animate-fade-in space-y-4 border-t border-border bg-background/40 px-4 py-4 text-[14px]">
                          {r.next_due_date && (
                            <p className="text-muted">
                              Next due <span className="font-semibold text-text">{formatDate(r.next_due_date)}</span>
                            </p>
                          )}
                          {r.vet_notes_plain_english && (
                            <div className="rounded-xl border border-primary/15 bg-primary-soft/40 p-3.5">
                              <p className="eyebrow flex items-center gap-1.5 text-primary-ink">
                                <SparkleIcon size={12} /> In plain English
                              </p>
                              <p className="mt-2 whitespace-pre-line leading-relaxed">{r.vet_notes_plain_english}</p>
                              {r.vet_notes_key_points && r.vet_notes_key_points.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                  {r.vet_notes_key_points.map((p, i) => (
                                    <li key={i} className="flex gap-2 leading-relaxed">
                                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                      {p}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {r.vet_notes_follow_up && (
                                <p
                                  className={`mt-3 rounded-lg px-3 py-2 text-[13px] font-medium ${
                                    r.vet_notes_urgency === 'urgent' ? 'bg-expired/10 text-expired' : 'bg-expiring/10 text-expiring'
                                  }`}
                                >
                                  Follow up: {r.vet_notes_follow_up}
                                </p>
                              )}
                            </div>
                          )}
                          {r.vet_notes_original && (
                            <details className="group">
                              <summary className="cursor-pointer text-[13px] font-semibold text-muted hover:text-text">What the vet wrote</summary>
                              <p className="mt-2 whitespace-pre-line rounded-xl bg-subtle/70 p-3 font-mono text-[12px] leading-relaxed">{r.vet_notes_original}</p>
                            </details>
                          )}
                          {r.notes && <p className="whitespace-pre-line leading-relaxed">{r.notes}</p>}
                          <div className="flex flex-wrap items-center gap-2">
                            {r.document && (
                              <a href={r.document} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-[13px]">
                                <FileIcon size={15} /> Open document
                              </a>
                            )}
                            {onEdit && (
                              <button onClick={() => onEdit(r)} className="btn-ghost px-3 py-2 text-[13px]">
                                <PencilIcon size={14} /> Edit
                              </button>
                            )}
                            {onEdit && (
                              <button
                                onClick={() => remove(r.id)}
                                disabled={deleting === r.id}
                                className="btn-ghost px-3 py-2 text-[13px] hover:bg-expired/5 hover:text-expired"
                              >
                                <TrashIcon size={14} /> {deleting === r.id ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
