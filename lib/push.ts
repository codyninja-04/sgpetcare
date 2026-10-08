import webpush from 'web-push'

export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

let configured = false

function configure(): boolean {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@sgpetcare.app', publicKey, privateKey)
  configured = true
  return true
}

export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/**
 * Returns the endpoints that are gone for good so the caller can delete them.
 * A wiped phone or a revoked permission answers 404 or 410, and retrying
 * those every day is how a reminder job gets slow.
 */
export async function sendPush(subscriptions: PushSubscriptionRecord[], payload: PushPayload): Promise<{ sent: number; dead: string[] }> {
  if (!configure() || subscriptions.length === 0) return { sent: 0, dead: [] }

  const body = JSON.stringify(payload)
  const dead: string[] = []
  let sent = 0

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) dead.push(sub.endpoint)
      }
    })
  )
  return { sent, dead }
}
