import { NextResponse } from 'next/server'
import { jsonError, requireUser } from '@/lib/api'
import { DOCUMENT_BUCKET, PHOTO_BUCKET } from '@/lib/storage'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Deletes everything. Files first, because storage objects do not cascade,
 * then the auth user, which cascades through every table.
 */
export async function DELETE() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  let admin
  try {
    admin = createServiceClient()
  } catch {
    return jsonError('Account deletion is not set up on this server yet.', 503)
  }

  for (const bucket of [PHOTO_BUCKET, DOCUMENT_BUCKET]) {
    for (;;) {
      const { data } = await admin.storage.from(bucket).list(auth.user.id, { limit: 100 })
      if (!data || data.length === 0) break
      await admin.storage.from(bucket).remove(data.map((f) => `${auth.user.id}/${f.name}`))
      if (data.length < 100) break
    }
  }

  const { error } = await admin.auth.admin.deleteUser(auth.user.id)
  if (error) return jsonError('Could not delete the account. Try again.', 500)

  await auth.supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
