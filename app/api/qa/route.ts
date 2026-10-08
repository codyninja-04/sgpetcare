import { NextResponse } from 'next/server'
import { cleanBody, isUuid, jsonError, readJson, requireUser } from '@/lib/api'
import { claudeConfigured } from '@/lib/claude/client'
import { cleanAnswer, streamPetCareAnswer, type QaPetContext } from '@/lib/claude/pet-care-qa'
import { todayISO } from '@/lib/dates'

export const runtime = 'nodejs'
export const maxDuration = 60

const DAILY_QUESTIONS = 30

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('qa_messages')
    .select('id, role, content, created_at, pet_id')
    .order('created_at', { ascending: false })
    .limit(40)
  if (error) return jsonError('Could not load your questions', 500)
  return NextResponse.json({ messages: (data ?? []).reverse() })
}

/**
 * Streams the answer back as plain text. The question is stored first, the
 * answer once it has finished, so a dropped connection never leaves half an
 * answer in the history.
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { supabase, user } = auth

  if (!claudeConfigured()) return jsonError('Questions are not set up on this server yet.', 503)

  const body = await readJson<{ question?: unknown; pet_id?: unknown }>(req)
  const question = cleanBody(body?.question, 2000)
  if (!question || question.length < 3) return jsonError('Ask a question first.')
  const petId = isUuid(body?.pet_id) ? body!.pet_id : null

  const startOfDay = new Date(`${todayISO()}T00:00:00+08:00`).toISOString()
  const { count } = await supabase
    .from('qa_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', startOfDay)
  if ((count ?? 0) >= DAILY_QUESTIONS) return jsonError(`That is ${DAILY_QUESTIONS} questions today. The limit resets at midnight.`, 429)

  let context: QaPetContext | null = null
  if (petId) {
    const [{ data: pet }, { data: records }] = await Promise.all([
      supabase
        .from('pets')
        .select('name, species, breed, sex, date_of_birth, weight_kg, is_sterilized, license_expiry, license_number, notes')
        .eq('id', petId)
        .maybeSingle(),
      supabase
        .from('health_records')
        .select('record_type, record_date, vaccine_name, next_due_date, vet_notes_plain_english')
        .eq('pet_id', petId)
        .order('record_date', { ascending: false })
        .limit(6),
    ])
    if (!pet) return jsonError('Pet not found', 404)
    context = { pet, records: records ?? [] } as QaPetContext
  }

  const { data: history } = await supabase
    .from('qa_messages')
    .select('role, content')
    .order('created_at', { ascending: false })
    .limit(10)

  const { error: saveError } = await supabase.from('qa_messages').insert({ user_id: user.id, pet_id: petId, role: 'user', content: question })
  if (saveError) return jsonError('Could not send that. Try again.', 500)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = ''
      try {
        const answer = streamPetCareAnswer({
          question,
          history: ((history ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>).reverse(),
          context,
        })
        for await (const event of answer) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            full += event.delta.text
            controller.enqueue(encoder.encode(event.delta.text.replace(/\s*[—–]\s*/g, ', ')))
          }
        }
        const cleaned = cleanAnswer(full)
        if (cleaned) await supabase.from('qa_messages').insert({ user_id: user.id, pet_id: petId, role: 'assistant', content: cleaned })
      } catch (err) {
        console.error('pet care answer failed', err)
        controller.enqueue(encoder.encode(full ? '\n\n(The answer was cut short. Try asking again.)' : 'Sorry, I could not answer that just now. Try again in a moment.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  })
}

export async function DELETE() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { error } = await auth.supabase.from('qa_messages').delete().eq('user_id', auth.user.id)
  if (error) return jsonError('Could not clear the history', 500)
  return NextResponse.json({ ok: true })
}
