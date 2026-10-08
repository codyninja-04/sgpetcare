import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Resolves the signed in user for an API route, or a 401 response to return. */
export async function requireUser(): Promise<
  { supabase: ReturnType<typeof createClient>; user: User; error?: never } | { error: NextResponse }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: jsonError('Sign in first', 401) }
  return { supabase, user }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

/** Single line text: trims, squeezes whitespace, caps the length. Empty becomes null. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/g, ' ')
  return t ? t.slice(0, max) : null
}

/** Multi line text such as notes. Keeps line breaks, squeezes runs of blank lines. */
export function cleanBody(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return t ? t.slice(0, max) : null
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

/** Accepts YYYY-MM-DD that is also a real calendar date. */
export function cleanDate(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const d = new Date(`${v}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null
  return v
}

export function cleanNumber(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return Math.round(n * 100) / 100
}

export function pick<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null
}
