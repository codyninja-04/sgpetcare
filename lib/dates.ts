/**
 * Every date in the app is a plain YYYY-MM-DD calendar day in Singapore time.
 * Vaccination and licence dates have no time of day, so doing the maths on
 * UTC midnights keeps "due tomorrow" correct no matter where the server runs.
 */

const SG = 'Asia/Singapore'
const DAY = 86_400_000

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SG, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function toUtc(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Whole days from `from` to `iso`. Negative means it has passed. */
export function daysUntil(iso: string, from = todayISO()): number {
  return Math.round((toUtc(iso) - toUtc(from)) / DAY)
}

export function addDaysISO(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY)
}

/** Adds calendar months, clamping 31 Jan + 1 month to the end of February. */
export function addMonthsISO(iso: string, months: number): string {
  const d = new Date(toUtc(iso))
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return fromUtc(d.getTime())
}

export function formatDate(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: opts.year === false ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(toUtc(iso)))
}

export function monthYear(iso: string): string {
  return new Intl.DateTimeFormat('en-SG', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(toUtc(iso)))
}

/** "today", "tomorrow", "in 12 days", "3 days ago" */
export function relativeDays(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0) return `in ${days} days`
  return `${-days} days ago`
}

/** Short due label for chips: "Due today", "Due in 5 days", "Overdue by 3 days". */
export function dueLabel(days: number): string {
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `Due in ${days} days`
  if (days === -1) return 'Overdue by 1 day'
  return `Overdue by ${-days} days`
}

export function ageParts(dob: string, today = todayISO()): { years: number; months: number; weeks: number } | null {
  const birth = new Date(toUtc(dob))
  const now = new Date(toUtc(today))
  if (birth > now) return null
  let months = (now.getUTCFullYear() - birth.getUTCFullYear()) * 12 + (now.getUTCMonth() - birth.getUTCMonth())
  if (now.getUTCDate() < birth.getUTCDate()) months -= 1
  const weeks = Math.floor((toUtc(today) - toUtc(dob)) / (7 * DAY))
  return { years: Math.floor(months / 12), months: months % 12, weeks }
}

/** "3 yrs 2 mths", "7 mths", "10 wks" */
export function ageLabel(dob: string | null | undefined): string | null {
  if (!dob) return null
  const p = ageParts(dob)
  if (!p) return null
  if (p.years === 0 && p.months < 3) return `${p.weeks} ${p.weeks === 1 ? 'wk' : 'wks'}`
  if (p.years === 0) return `${p.months} mths`
  const y = `${p.years} ${p.years === 1 ? 'yr' : 'yrs'}`
  return p.months ? `${y} ${p.months} ${p.months === 1 ? 'mth' : 'mths'}` : y
}

export function ageYears(dob: string | null | undefined): number | null {
  if (!dob) return null
  const p = ageParts(dob)
  if (!p) return null
  return Math.round((p.years + p.months / 12) * 10) / 10
}
