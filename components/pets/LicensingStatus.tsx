import { formatDate } from '@/lib/dates'
import type { LicenseStatus as Status } from '@/lib/license'
import { IdCardIcon } from '@/components/ui/Icons'
import { LicenseBadge } from './LicenseBadge'

const RING: Record<Status['state'], string> = {
  valid: 'rgb(var(--license-valid))',
  expiring: 'rgb(var(--license-expiring))',
  expired: 'rgb(var(--license-expired))',
  missing: 'rgb(var(--border))',
  not_required: 'rgb(var(--border))',
}

/**
 * The licence at a glance: a ring that drains over the final year, the
 * number, the expiry and a plain sentence on what to do next.
 */
export function LicensingStatus({
  status,
  licenseNumber,
  expiry,
  petName,
}: {
  status: Status
  licenseNumber: string | null
  expiry: string | null
  petName: string
}) {
  const fraction = status.days == null ? 0 : Math.max(0, Math.min(1, status.days / 365))
  const r = 44
  const circumference = 2 * Math.PI * r

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--subtle))" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={RING[status.state]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (status.state === 'expired' ? 1 : fraction))}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            {status.days != null ? (
              <div>
                <p className="font-display text-3xl font-bold leading-none tracking-tight">{Math.abs(status.days)}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{status.days < 0 ? 'days over' : 'days left'}</p>
              </div>
            ) : (
              <IdCardIcon size={32} className="text-muted/60" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <LicenseBadge state={status.state} label={status.label} prefix={false} />
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
            {status.state === 'not_required' ? `${petName} does not need a licence` : `${petName}'s AVS licence`}
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{status.detail}</p>
        </div>
      </div>

      {(licenseNumber || expiry) && (
        <dl className="grid grid-cols-2 divide-x divide-border border-t border-border bg-background/40">
          <div className="px-6 py-4">
            <dt className="eyebrow">Licence number</dt>
            <dd className="mt-1 truncate font-mono text-[14px] font-semibold">{licenseNumber || 'Not recorded'}</dd>
          </div>
          <div className="px-6 py-4">
            <dt className="eyebrow">Expires</dt>
            <dd className="mt-1 text-[14px] font-semibold">{expiry ? formatDate(expiry) : 'Not recorded'}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
