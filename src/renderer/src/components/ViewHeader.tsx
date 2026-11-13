import type { ReactNode } from 'react'

export function ViewHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="flex flex-none items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div>
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </header>
  )
}
