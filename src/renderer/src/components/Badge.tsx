import type { ReactNode } from 'react'
import type { BadgeTone } from '../lib/rooms'

const TONES: Record<BadgeTone, string> = {
  open: 'bg-success/15 text-success',
  closed: 'bg-danger/15 text-danger',
  paused: 'bg-warning/15 text-warning',
  neutral: 'bg-surface-2 text-muted',
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
