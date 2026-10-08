import Link from 'next/link'
import { PRO_PRICE } from '@/lib/plan'
import { SparkleIcon } from './Icons'

export function ProGate({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/80 to-surface ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-white">
          <SparkleIcon size={18} />
        </span>
        <div>
          <p className="font-display text-[16px] font-bold tracking-tight">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
          <Link href="/settings#plan" className="btn-primary mt-3 px-3.5 py-2 text-[13px]">
            See Pro, {PRO_PRICE} a month
          </Link>
        </div>
      </div>
    </div>
  )
}
