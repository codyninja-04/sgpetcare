import { daysUntil, dueLabel, formatDate } from '@/lib/dates'
import { REMINDER_LABELS, speciesEmoji, type ReminderType, type Species } from '@/lib/types'

export interface DigestItem {
  petId: string
  petName: string
  species: Species | null
  type: ReminderType
  label: string | null
  dueDate: string
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const NUDGE: Record<ReminderType, string> = {
  vaccination_due: 'Call your vet to book the booster. Bring the vaccination booklet so they can stamp it.',
  deworming_due: 'Time for the next dose. If you buy it from the vet, ask them to note the date in the booklet.',
  license_renewal: 'Renew on the NParks pet licensing portal. It only takes a few minutes with the microchip number handy.',
  checkup_due: 'Book the follow up with your vet.',
}

export function digestSubject(items: DigestItem[]): string {
  if (items.length === 1) {
    const i = items[0]
    const days = daysUntil(i.dueDate)
    const what = i.label || REMINDER_LABELS[i.type]
    return `${i.petName}: ${what} ${days <= 0 ? 'is due' : days === 1 ? 'is due tomorrow' : `in ${days} days`}`
  }
  const pets = Array.from(new Set(items.map((i) => i.petName)))
  return `${items.length} things coming up for ${pets.length === 1 ? pets[0] : pets.slice(0, -1).join(', ') + ' and ' + pets[pets.length - 1]}`
}

export function digestText(items: DigestItem[]): string {
  return items
    .map((i) => `${i.petName}: ${i.label || REMINDER_LABELS[i.type]}, ${dueLabel(daysUntil(i.dueDate)).toLowerCase()} (${formatDate(i.dueDate)})`)
    .join('\n')
}

export function digestHtml(items: DigestItem[], name: string | null): string {
  const rows = items
    .map((i) => {
      const days = daysUntil(i.dueDate)
      const colour = days < 0 ? '#DC2626' : days <= 7 ? '#D97706' : '#7D6A5E'
      const href = `${appUrl()}/pets/${i.petId}/${i.type === 'license_renewal' ? 'licensing' : 'health'}`
      return `
        <tr>
          <td style="padding:16px 0;border-top:1px solid #F0E1D0;vertical-align:top;width:40px;font-size:24px;">${speciesEmoji(i.species)}</td>
          <td style="padding:16px 0;border-top:1px solid #F0E1D0;vertical-align:top;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#291C14;">${escapeHtml(i.petName)}: ${escapeHtml(i.label || REMINDER_LABELS[i.type])}</p>
            <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:${colour};">${dueLabel(days)} &middot; ${formatDate(i.dueDate)}</p>
            <p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:#7D6A5E;">${NUDGE[i.type]}</p>
            <a href="${href}" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:#C2410C;text-decoration:none;">Open in SGPetCare &rarr;</a>
          </td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background:#FFF7ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#291C14;">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #F0E1D0;border-radius:18px;overflow:hidden;">
      <div style="padding:22px 24px;background:#EA580C;color:#FFFFFF;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">SGPetCare</p>
        <p style="margin:6px 0 0;font-size:21px;font-weight:800;">${items.length === 1 ? 'A heads up' : 'Coming up soon'}</p>
      </div>
      <div style="padding:8px 24px 24px;">
        <p style="margin:16px 0 4px;font-size:14px;line-height:1.6;color:#7D6A5E;">
          Hi${name ? ` ${escapeHtml(name.split(' ')[0])}` : ''}, here is what is due for your ${items.some((i) => i.petId !== items[0].petId) ? 'pets' : 'pet'}.
        </p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#A8968A;">
          Ticked it off already? Mark it done in the app and we will stop reminding you.
          Change how early these arrive in <a href="${appUrl()}/settings" style="color:#C2410C;">settings</a>.
        </p>
        <p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#A8968A;">
          SGPetCare is a record keeping tool, not veterinary advice. Always consult a licensed veterinarian for your pet's health concerns.
        </p>
      </div>
    </div>
  </body>
</html>`
}
