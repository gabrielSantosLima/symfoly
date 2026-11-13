export type View = 'rooms' | 'agents' | 'connect' | 'settings' | 'about'

export const inputClass =
  'h-8 rounded-md border border-border bg-surface px-2.5 text-[13px] text-fg placeholder:text-faint focus:border-brand'

export const buttonClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50'

export const buttonGhostClass =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-2'

export const buttonQuietClass =
  'inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg'

export const iconButtonClass =
  'inline-grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg'

export const cardClass = 'rounded-xl border border-border bg-surface'
