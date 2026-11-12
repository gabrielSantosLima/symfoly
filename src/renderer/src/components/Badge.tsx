import type { ReactNode } from 'react'
import type { BadgeTone } from '../lib/rooms'

const TONES: Record<BadgeTone, string> = {
  open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  closed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  neutral: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
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
