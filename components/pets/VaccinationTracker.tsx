import { dueLabel, formatDate } from '@/lib/dates'
import { CORE_VACCINE, trackVaccines, type VaccineState } from '@/lib/health'
import type { HealthRecord, Species } from '@/lib/types'
import { SyringeIcon } from '@/components/ui/Icons'

const STATE: Record<VaccineState, { label: (d: number | null) => string; cls: string; bar: string }> = {
  overdue: { label: (d) => dueLabel(d ?? 0), cls: 'bg-expired/10 text-expired', bar: 'bg-expired' },
  due_soon: { label: (d) => dueLabel(d ?? 0), cls: 'bg-expiring/10 text-expiring', bar: 'bg-expiring' },
  up_to_date: { label: () => 'Up to date', cls: 'bg-valid/10 text-valid', bar: 'bg-valid' },
  no_due_date: { label: () => 'No booster date', cls: 'bg-subtle text-muted', bar: 'bg-border' },
}

export function VaccinationTracker({
  records,
  species,
  petName,
}: {
  records: Pick<HealthRecord, 'record_type' | 'vaccine_name' | 'record_date' | 'next_due_date'>[]
  species: Species | null
  petName: string
}) {
  const vaccines = trackVaccines(records)
  const core = species ? CORE_VACCINE[species] : undefined
  const missingCore = core && !vaccines.some((v) => core.match.test(v.name))

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <SyringeIcon size={18} className="text-primary" />
          Vaccinations
        </h2>
        {vaccines.length > 0 && (
          <span className="text-[12px] text-muted">
            {vaccines.filter((v) => v.state === 'up_to_date').length} of {vaccines.length} up to date
          </span>
        )}
      </div>

      {vaccines.length === 0 ? (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">
          No vaccinations logged for {petName} yet. The vet booklet has the dates and the sticker from each vial.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {vaccines.map((v) => {
            const s = STATE[v.state]
            return (
              <li key={v.name} className="relative overflow-hidden rounded-xl border border-border py-3 pl-4 pr-3">
                <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{v.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      Last given {formatDate(v.lastGiven)}
                      {v.doses > 1 ? ` · ${v.doses} doses logged` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label(v.days)}</span>
                </div>
                {v.nextDue && <p className="mt-1.5 text-[12px] text-muted">Next {formatDate(v.nextDue)}</p>}
              </li>
            )
          })}
        </ul>
      )}

      {missingCore && (
        <p className="mt-4 rounded-xl bg-subtle/70 px-3.5 py-3 text-[13px] leading-relaxed text-muted">
          We have not spotted {core.label} in these records. If the booklet uses a different name, you can ignore this.
        </p>
      )}
    </div>
  )
}
