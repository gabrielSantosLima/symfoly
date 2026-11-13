import type { ReactNode } from 'react'

export type Tone = 'working' | 'attention' | 'success' | 'danger' | 'neutral' | 'brand'

const TONES: Record<Tone, string> = {
  working: 'bg-[var(--tint-working)] text-working',
  attention: 'bg-[var(--tint-attention)] text-attention',
  success: 'bg-[var(--tint-success)] text-success',
  danger: 'bg-[var(--tint-danger)] text-danger',
  neutral: 'bg-[var(--tint-neutral)] text-muted',
  brand: 'bg-brand-soft text-brand',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-semibold uppercase tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/** Small status dot with a soft halo; always pair it with a text label. */
export function StatusDot({ tone = 'neutral' }: { tone?: Tone }) {
  const color =
    tone === 'working'
      ? 'var(--working)'
      : tone === 'attention'
        ? 'var(--attention)'
        : tone === 'success'
          ? 'var(--success)'
          : tone === 'danger'
            ? 'var(--danger)'
            : tone === 'brand'
              ? 'var(--brand)'
              : 'var(--neutral)'
  const tint =
    tone === 'working'
      ? 'var(--tint-working)'
      : tone === 'attention'
        ? 'var(--tint-attention)'
        : tone === 'success'
          ? 'var(--tint-success)'
          : tone === 'danger'
            ? 'var(--tint-danger)'
            : tone === 'brand'
              ? 'var(--brand-soft)'
              : 'var(--tint-neutral)'
  return (
    <span
      aria-hidden
      className="h-2 w-2 flex-none rounded-full"
      style={{ background: color, boxShadow: `0 0 0 3px ${tint}` }}
    />
  )
}
