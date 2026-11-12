import type { ProtocolMessage } from '../../../shared/protocol'

const KIND_STYLES: Record<string, string> = {
  chat: 'text-slate-500 dark:text-slate-400',
  task: 'text-indigo-500 dark:text-indigo-300',
  result: 'text-emerald-600 dark:text-emerald-300',
  system: 'text-slate-400 dark:text-slate-500',
}

export function MessageItem({ message }: { message: ProtocolMessage }) {
  const isSystem = message.kind === 'system'
  return (
    <li
      className={`rounded-md px-3 py-2 text-sm ${
        isSystem ? 'bg-slate-100 italic dark:bg-slate-900' : ''
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-indigo-600 dark:text-indigo-300">
          {message.senderName}
        </span>
        {message.to ? <span className="text-slate-400">→ {message.to}</span> : null}
        <span className={`text-[10px] uppercase tracking-wide ${KIND_STYLES[message.kind] ?? ''}`}>
          {message.kind}
        </span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap text-slate-800 dark:text-slate-200">
        {message.text}
      </p>
    </li>
  )
}
