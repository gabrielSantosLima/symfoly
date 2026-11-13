import { MdDarkMode, MdLightMode, MdSearch } from 'react-icons/md'
import { useAppData } from '../contexts/AppDataContext'
import type { ResolvedTheme } from '../hooks/useTheme'
import { iconButtonClass } from '../lib/ui'
import { Logo } from './Logo'
import { StatusDot } from './Badge'

export function TopBar({
  theme,
  query,
  onQuery,
}: {
  theme: ResolvedTheme
  query: string
  onQuery: (value: string) => void
}) {
  const { status, saveSettings } = useAppData()
  const channel = status?.channel
  const isDark = theme === 'dark'

  return (
    <header className="flex h-13 flex-none items-center gap-3.5 border-b border-border bg-surface px-4">
      <h1 className="flex items-center gap-2.5 text-sm font-bold tracking-tight">
        <span aria-hidden>
          <Logo className="h-5 w-5 text-brand" />
        </span>
        Symfoly
        {channel && channel !== 'production' ? (
          <span className="rounded bg-[var(--tint-attention)] px-1.5 py-px text-[9.5px] font-bold tracking-wide text-attention">
            {channel.toUpperCase()}
          </span>
        ) : null}
      </h1>

      <span className="h-5 w-px bg-border" />

      <div className="flex items-center gap-2 text-xs text-muted">
        <StatusDot tone="success" />
        Hub online
        <span className="font-mono text-[11px]">{status ? status.url : 'connecting…'}</span>
      </div>

      <label className="mx-auto flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-muted focus-within:border-brand">
        <MdSearch className="h-4 w-4" aria-hidden />
        <input
          aria-label="Search rooms"
          placeholder="Search rooms, agents, tasks…"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-faint"
        />
      </label>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={iconButtonClass}
          title="Toggle theme"
          onClick={() => void saveSettings({ theme: isDark ? 'light' : 'dark' })}
        >
          {isDark ? <MdLightMode aria-hidden /> : <MdDarkMode aria-hidden />}
        </button>
        <span
          title="you (observer)"
          className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-brand-fg"
          style={{ background: 'linear-gradient(150deg, #a78bfa, #7c5cf0)' }}
        >
          Y
        </span>
      </div>
    </header>
  )
}
