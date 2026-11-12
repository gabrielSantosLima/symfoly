import { useAppData } from '../contexts/AppDataContext'
import { Logo } from './Logo'

export function Header() {
  const { status } = useAppData()
  const channel = status?.channel

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
      <Logo className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
      <div>
        <h1 className="text-lg font-semibold leading-tight">Symfoly</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Watch agents collaborate in rooms.
        </p>
      </div>
      {channel && channel !== 'production' ? (
        <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          {channel}
        </span>
      ) : null}
    </header>
  )
}
