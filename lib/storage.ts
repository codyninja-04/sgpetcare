import type { SupabaseClient } from '@supabase/supabase-js'

export const PHOTO_BUCKET = 'pet-photos'
export const DOCUMENT_BUCKET = 'vet-documents'
export type Bucket = typeof PHOTO_BUCKET | typeof DOCUMENT_BUCKET

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/**
 * Files live at <bucket>/<user_id>/<random>.<ext> and we store that path, not
 * a URL. Both buckets are private, so anything rendered is signed first.
 */
export async function uploadFile(supabase: SupabaseClient, userId: string, bucket: Bucket, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(error.message)
  return `${bucket}/${path}`
}

function split(reference: string): { bucket: string; path: string } | null {
  const [bucket, ...rest] = reference.split('/')
  const path = rest.join('/')
  if (!bucket || !path) return null
  return { bucket, path }
}

/** A stored reference is only accepted if it sits in one of our buckets under the caller's folder. */
export function ownsReference(reference: unknown, userId: string, bucket: Bucket): reference is string {
  if (typeof reference !== 'string') return false
  const parts = split(reference)
  return Boolean(parts && parts.bucket === bucket && parts.path.startsWith(`${userId}/`) && !parts.path.includes('..'))
}

export async function signFile(supabase: SupabaseClient, reference: string | null | undefined, expires = 3600): Promise<string | null> {
  if (!reference) return null
  const parts = split(reference)
  if (!parts) return null
  const { data, error } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, expires)
  if (error) return null
  return data?.signedUrl ?? null
}

/** Signs many references in one round trip per bucket. Missing ones map to null. */
export async function signMany(
  supabase: SupabaseClient,
  references: Array<string | null | undefined>,
  expires = 3600
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const byBucket = new Map<string, string[]>()
  for (const ref of references) {
    if (!ref) continue
    const parts = split(ref)
    if (!parts) continue
    byBucket.set(parts.bucket, [...(byBucket.get(parts.bucket) ?? []), parts.path])
  }

  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, expires)
      for (const row of data ?? []) {
        if (row.signedUrl && row.path) out.set(`${bucket}/${row.path}`, row.signedUrl)
      }
    })
  )
  return out
}

export async function removeFiles(supabase: SupabaseClient, references: Array<string | null | undefined>): Promise<void> {
  const byBucket = new Map<string, string[]>()
  for (const ref of references) {
    if (!ref) continue
    const parts = split(ref)
    if (!parts) continue
    byBucket.set(parts.bucket, [...(byBucket.get(parts.bucket) ?? []), parts.path])
  }
  await Promise.all(Array.from(byBucket.entries()).map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths)))
}

export function fileProblem(file: File, opts: { allowPdf?: boolean } = {}): string | null {
  const okType = file.type.startsWith('image/') || (opts.allowPdf && file.type === 'application/pdf')
  if (!okType) return opts.allowPdf ? 'That needs to be a photo or a PDF.' : 'That needs to be a photo.'
  if (file.size > MAX_UPLOAD_BYTES) return 'That file is over 8MB. Try a smaller one.'
  return null
}
