'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { daysUntil, dueLabel, formatDate } from '@/lib/dates'
import type { UpcomingReminder } from '@/lib/reminders'
import { REMINDER_LABELS, speciesEmoji, type ReminderType } from '@/lib/types'
import { BugIcon, CheckIcon, IdCardIcon, StethoscopeIcon, SyringeIcon } from '@/components/ui/Icons'

const ICONS: Record<ReminderType, typeof SyringeIcon> = {
  vaccination_due: SyringeIcon,
  deworming_due: BugIcon,
  license_renewal: IdCardIcon,
  checkup_due: StethoscopeIcon,
}

function tone(days: number) {
  if (days < 0) return { chip: 'bg-expired/10 text-expired', icon: 'bg-expired/10 text-expired' }
  if (days <= 14) return { chip: 'bg-expiring/10 text-expiring', icon: 'bg-expiring/10 text-expiring' }
  return { chip: 'bg-subtle text-muted', icon: 'bg-primary-soft text-primary' }
}

/**
 * Open reminders, soonest first. Ticking one off hides it straight away and
 * the server catches up, because this is the thing people tap at the vet.
 */
export function UpcomingList({
  reminders,
  showPet = true,
  emptyText = 'Nothing coming up. Log a vaccination with a next due date and it will show here.',
}: {
  reminders: UpcomingReminder[]
  showPet?: boolean
  emptyText?: string
}) {
  const router = useRouter()
  const [done, setDone] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function complete(id: string) {
    setError(null)
    setDone((s) => new Set(s).add(id))
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: true }),
    })
    if (!res.ok) {
      setDone((s) => {
        const next = new Set(s)
        next.delete(id)
        return next
      })
      setError('Could not tick that off. Try again.')
      return
    }
    router.refresh()
  }

  const visible = reminders.filter((r) => !done.has(r.id))

  if (visible.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{emptyText}</p>
  }

  return (
    <div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {visible.map((r) => {
          const days = daysUntil(r.due_date)
          const t = tone(days)
          const Icon = ICONS[r.reminder_type] ?? StethoscopeIcon
          const href = r.reminder_type === 'license_renewal' ? `/pets/${r.pet_id}/licensing` : `/pets/${r.pet_id}/health`
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.icon}`}>
                <Icon size={18} />
              </span>
              <Link href={href} className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">
                  {showPet && r.pet && (
                    <span className="mr-1.5" aria-hidden>
                      {speciesEmoji(r.pet.species)}
                    </span>
                  )}
                  {showPet && r.pet ? `${r.pet.name}: ` : ''}
                  {r.label || REMINDER_LABELS[r.reminder_type]}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{formatDate(r.due_date)}</p>
              </Link>
              <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold sm:inline ${t.chip}`}>{dueLabel(days)}</span>
              <button
                onClick={() => complete(r.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted transition hover:border-valid/40 hover:bg-valid/10 hover:text-valid"
                aria-label={`Mark ${r.label || REMINDER_LABELS[r.reminder_type]} as done`}
                title="Mark as done"
              >
                <CheckIcon size={16} />
              </button>
            </li>
          )
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-expired">
          {error}
        </p>
      )}
    </div>
  )
}
