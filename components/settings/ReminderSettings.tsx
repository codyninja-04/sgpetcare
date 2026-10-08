'use client'

import { useEffect, useState } from 'react'
import { BellIcon, CheckIcon } from '@/components/ui/Icons'

type PushState = 'unsupported' | 'blocked' | 'off' | 'on' | 'working'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const LEADS = [
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
]

export function ReminderSettings({
  initial,
  email,
  vapidKey,
}: {
  initial: { email_reminders: boolean; push_reminders: boolean; reminder_lead_days: number }
  email: string | null
  vapidKey: string | null
}) {
  const [prefs, setPrefs] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [push, setPush] = useState<PushState>('off')

  useEffect(() => {
    if (!vapidKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPush('unsupported')
      return
    }
    if (Notification.permission === 'denied') return setPush('blocked')
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription()
      setPush(sub ? 'on' : 'off')
    })
  }, [vapidKey])

  async function save(patch: Partial<typeof prefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    setSaved(false)
    setError(null)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      setPrefs(prefs)
      const json = await res.json().catch(() => ({}))
      return setError(json.error || 'Could not save. Try again.')
    }
    setSaved(true)
  }

  async function enablePush() {
    if (!vapidKey) return
    setPush('working')
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return setPush(permission === 'denied' ? 'blocked' : 'off')
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
      await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource }))
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error()
      setPush('on')
      if (!prefs.push_reminders) await save({ push_reminders: true })
    } catch {
      setPush('off')
      setError('Could not turn on notifications for this device.')
    }
  }

  async function disablePush() {
    setPush('working')
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
    setPush('off')
  }

  return (
    <section id="reminders" className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <BellIcon size={18} className="text-primary" />
          Reminders
        </h2>
        {saved && (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-valid">
            <CheckIcon size={13} /> Saved
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="label">How early</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Reminder lead time">
          {LEADS.map((l) => (
            <button
              key={l.value}
              role="radio"
              aria-checked={prefs.reminder_lead_days === l.value}
              onClick={() => save({ reminder_lead_days: l.value })}
              className={`chip justify-center py-2.5 ${prefs.reminder_lead_days === l.value ? 'chip-on' : ''}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="hint">One digest covers everything that comes into that window, so you will not get a pile of separate emails.</p>
      </div>

      <div className="mt-6 divide-y divide-border rounded-xl border border-border">
        <Toggle
          label="Email"
          detail={email ? `Sent to ${email}` : 'No email on this account'}
          checked={prefs.email_reminders}
          onChange={(v) => save({ email_reminders: v })}
        />
        <Toggle
          label="Push notifications"
          detail={
            push === 'unsupported'
              ? 'Not available in this browser. On iPhone, add SGPetCare to your home screen first.'
              : push === 'blocked'
                ? 'Blocked in your browser settings for this site.'
                : push === 'on'
                  ? 'On for this device.'
                  : 'Turn on for each phone or computer you use.'
          }
          checked={prefs.push_reminders}
          onChange={(v) => save({ push_reminders: v })}
        />
      </div>

      {push !== 'unsupported' && push !== 'blocked' && (
        <div className="mt-4">
          {push === 'on' ? (
            <button onClick={disablePush} className="btn-secondary text-[13px]">
              Stop notifications on this device
            </button>
          ) : (
            <button onClick={enablePush} disabled={push === 'working'} className="btn-secondary text-[13px]">
              <BellIcon size={15} />
              {push === 'working' ? 'Asking...' : 'Allow notifications on this device'}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-expired">
          {error}
        </p>
      )}
    </section>
  )
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
      <span>
        <span className="block text-[14px] font-semibold">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{detail}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-border transition peer-checked:bg-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}
