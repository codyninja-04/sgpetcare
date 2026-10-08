'use client'

import { useEffect, useRef } from 'react'
import { XIcon } from './Icons'

export function Modal({
  open,
  onClose,
  title,
  wide = false,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  // Callers pass inline closures, so keep the latest one in a ref. Otherwise
  // the effect below would re-run on every render and steal focus mid typing.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const prev = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 animate-fade-in bg-text/25 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <div
        ref={panel}
        className={`relative max-h-[92vh] w-full animate-rise-in overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-lift sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="-mr-2 -mt-1 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-text"
            aria-label="Close"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
