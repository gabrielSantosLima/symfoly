import type { ProtocolMessage } from '../../../shared/protocol'

const KIND_STYLES: Record<string, string> = {
  chat: 'text-muted',
  task: 'text-brand',
  result: 'text-success',
  system: 'text-muted',
}

export function MessageItem({ message }: { message: ProtocolMessage }) {
  const isSystem = message.kind === 'system'
  return (
    <li
      className={`rounded-md px-3 py-2 text-sm ${isSystem ? 'bg-surface-2 italic' : 'bg-surface'}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-brand">{message.senderName}</span>
        {message.to ? <span className="text-muted">→ {message.to}</span> : null}
        <span className={`text-[10px] uppercase tracking-wide ${KIND_STYLES[message.kind] ?? ''}`}>
          {message.kind}
        </span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-fg">{message.text}</p>
    </li>
  )
}
