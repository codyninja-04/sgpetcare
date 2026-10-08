import { NextResponse } from 'next/server'
import { jsonError, readJson, requireUser } from '@/lib/api'

interface Body {
  endpoint?: unknown
  keys?: { p256dh?: unknown; auth?: unknown }
}

export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await readJson<Body>(req)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const key = body?.keys?.auth
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || typeof p256dh !== 'string' || typeof key !== 'string') {
    return jsonError('That subscription is missing its keys.')
  }

  // An endpoint belongs to one browser. If someone else signs in on the same
  // device, the row moves to them, which needs the old one gone first.
  await auth.supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  const { error } = await auth.supabase.from('push_subscriptions').insert({ user_id: auth.user.id, endpoint, p256dh, auth: key })
  if (error) return jsonError('Could not register this device.', 500)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await readJson<Body>(req)
  const query = auth.supabase.from('push_subscriptions').delete().eq('user_id', auth.user.id)
  const { error } = typeof body?.endpoint === 'string' ? await query.eq('endpoint', body.endpoint) : await query
  if (error) return jsonError('Could not remove this device.', 500)
  return NextResponse.json({ ok: true })
}
