import type { Metadata } from 'next'
import { DangerZone } from '@/components/settings/DangerZone'
import { ReminderSettings } from '@/components/settings/ReminderSettings'
import { CheckIcon, SparkleIcon } from '@/components/ui/Icons'
import { FREE_PETS, PRO_PRICE, getUsage, limitsEnforced } from '@/lib/plan'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Settings' }

const PRO_FEATURES = ['As many pets as you have', 'Plain English vet notes, typed or photographed', 'AVS licence renewal reminders', 'Photos of invoices, certificates and reports']

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, usage] = await Promise.all([
    supabase.from('profiles').select('email_reminders, push_reminders, reminder_lead_days').eq('id', user!.id).maybeSingle(),
    getUsage(supabase, user!.id),
  ])

  const prefs = {
    email_reminders: profile?.email_reminders ?? true,
    push_reminders: profile?.push_reminders ?? true,
    reminder_lead_days: profile?.reminder_lead_days ?? 14,
  }

  return (
    <div className="mx-auto max-w-2xl animate-rise-in space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted">Signed in as {user!.email}</p>
      </header>

      <ReminderSettings initial={prefs} email={user!.email ?? null} vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} />

      <section id="plan" className="card overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <SparkleIcon size={18} className="text-primary" />
              Plan
            </h2>
            <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${usage.plan === 'pro' ? 'bg-primary text-white' : 'bg-subtle text-muted'}`}>
              {usage.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Free covers {FREE_PETS} pet with full vaccination, deworming and vet visit records. Pro is {PRO_PRICE} a month and adds:
          </p>
          <ul className="mt-4 space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[14px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <CheckIcon size={12} strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border bg-background/50 px-5 py-4 text-[13px] text-muted sm:px-6">
          {usage.plan === 'pro'
            ? 'Thanks for supporting SGPetCare.'
            : limitsEnforced()
              ? 'Payments are coming soon. Pro features unlock the moment they launch.'
              : 'Everything is unlocked while SGPetCare is in early access.'}
        </div>
      </section>

      <DangerZone />
    </div>
  )
}
