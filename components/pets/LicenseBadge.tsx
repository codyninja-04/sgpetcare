import type { LicenseState } from '@/lib/license'

const STYLES: Record<LicenseState, string> = {
  valid: 'bg-valid/10 text-valid ring-valid/20',
  expiring: 'bg-expiring/10 text-expiring ring-expiring/25',
  expired: 'bg-expired/10 text-expired ring-expired/20',
  missing: 'bg-subtle text-muted ring-border',
  not_required: 'bg-subtle text-muted ring-border',
}

const DOT: Record<LicenseState, string> = {
  valid: 'bg-valid',
  expiring: 'bg-expiring',
  expired: 'bg-expired',
  missing: 'bg-muted/50',
  not_required: 'bg-muted/40',
}

export function LicenseBadge({ state, label, prefix = true }: { state: LicenseState; label: string; prefix?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${STYLES[state]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} />
      {prefix && state !== 'not_required' ? `Licence: ${label.toLowerCase()}` : label}
    </span>
  )
}
