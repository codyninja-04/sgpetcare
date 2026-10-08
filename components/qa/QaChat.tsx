'use client'

import { useEffect, useRef, useState } from 'react'
import { PetAvatar } from '@/components/pets/PetAvatar'
import { Disclaimer } from '@/components/health/Disclaimer'
import { LogoMark, SendIcon, SunIcon, TrashIcon } from '@/components/ui/Icons'
import type { QaMessage, Species } from '@/lib/types'

export interface QaPet {
  id: string
  name: string
  species: Species | null
  photo: string | null
}

type Msg = Pick<QaMessage, 'role' | 'content' | 'pet_id'> & { id: string; pending?: boolean }

function suggestions(pet: QaPet | null): string[] {
  const name = pet?.name ?? 'my dog'
  if (pet?.species === 'cat')
    return [
      `How do I keep ${pet.name} cool when the aircon is off?`,
      'Which plants in an HDB flat are dangerous for cats?',
      `${pet.name} is not using the litter box. What could cause that?`,
      'What does a cat licence need under the new framework?',
    ]
  return [
    `What time of day is safe to walk ${name} in this heat?`,
    'How often should I do tick and heartworm prevention here?',
    'Roughly what does a yearly vaccination cost at a Singapore vet?',
    'Which dog breeds are allowed in HDB flats?',
  ]
}

/** Renders the plain text answer: paragraphs, and "- " lines as a real list. */
function Answer({ text }: { text: string }) {
  const blocks = text.replace(/\s*[—–]\s*/g, ', ').split(/\n{2,}/)
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <span>{l.replace(/^\s*[-•]\s+/, '')}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        )
      })}
    </div>
  )
}

export function QaChat({ pets, initial }: { pets: QaPet[]; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial)
  const [petId, setPetId] = useState<string | null>(pets.length === 1 ? pets[0].id : null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  const pet = pets.find((p) => p.id === petId) ?? null
  const petById = new Map(pets.map((p) => [p.id, p]))

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    setBusy(true)
    setError(null)
    setInput('')

    const answerId = `a-${Date.now()}`
    setMessages((m) => [
      ...m,
      { id: `q-${Date.now()}`, role: 'user', content: q, pet_id: petId },
      { id: answerId, role: 'assistant', content: '', pet_id: petId, pending: true },
    ])

    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, pet_id: petId }),
      })
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Could not send that. Try again.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setMessages((m) => m.map((msg) => (msg.id === answerId ? { ...msg, content: text } : msg)))
      }
      setMessages((m) => m.map((msg) => (msg.id === answerId ? { ...msg, pending: false } : msg)))
    } catch (err) {
      setMessages((m) => m.filter((msg) => msg.id !== answerId))
      setInput(q)
      setError(err instanceof Error ? err.message : 'Could not send that. Try again.')
    } finally {
      setBusy(false)
      box.current?.focus()
    }
  }

  async function clearHistory() {
    if (!window.confirm('Clear all your past questions?')) return
    const res = await fetch('/api/qa', { method: 'DELETE' })
    if (res.ok) setMessages([])
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col lg:min-h-[calc(100vh-80px)]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Ask about pet care</h1>
          <p className="mt-1.5 text-sm text-muted">General questions with Singapore in mind: the heat, ticks, HDB rules, what things cost.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="btn-ghost px-3 py-2 text-[13px]">
            <TrashIcon size={14} /> Clear
          </button>
        )}
      </header>

      {pets.length > 0 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Which pet is this about?">
          <button role="radio" aria-checked={petId === null} onClick={() => setPetId(null)} className={`chip shrink-0 ${petId === null ? 'chip-on' : ''}`}>
            General
          </button>
          {pets.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={petId === p.id}
              onClick={() => setPetId(p.id)}
              className={`chip shrink-0 py-1 pl-1 ${petId === p.id ? 'chip-on' : ''}`}
            >
              <PetAvatar photo={p.photo} species={p.species} name={p.name} size="xs" />
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex-1 space-y-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="card animate-rise-in p-6">
            <div className="flex items-center gap-2 text-primary">
              <SunIcon size={18} />
              <p className="text-[13px] font-semibold">Try one of these</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {suggestions(pet).map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-xl border border-border px-4 py-3 text-left text-[14px] leading-snug transition hover:border-primary/30 hover:bg-primary-soft/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          if (m.role === 'user') {
            const about = m.pet_id ? petById.get(m.pet_id) : null
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
                  {about && <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">About {about.name}</p>}
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className="flex gap-3">
              <span className="mt-0.5 shrink-0">
                <LogoMark size={28} />
              </span>
              <div className="card min-w-0 max-w-[85%] rounded-tl-md px-4 py-3 text-[15px] leading-relaxed">
                {m.content ? (
                  <Answer text={m.content} />
                ) : (
                  <span className="flex gap-1 py-2" aria-label="Thinking">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-primary/50" />
                  </span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 px-4 pb-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        {error && (
          <p role="alert" className="mb-2 text-[13px] text-expired">
            {error}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={box}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(input)
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={pet ? `Ask about ${pet.name}...` : 'Ask a pet care question...'}
            aria-label="Your question"
            className="input max-h-40 min-h-[46px] flex-1 resize-none leading-relaxed"
          />
          <button type="submit" disabled={busy || input.trim().length < 3} className="btn-primary h-[46px] w-[46px] shrink-0 p-0" aria-label="Send">
            <SendIcon size={18} />
          </button>
        </form>
        <Disclaimer className="mt-2 text-center" />
      </div>
    </div>
  )
}
