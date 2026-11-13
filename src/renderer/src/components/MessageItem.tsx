import type { MessageKind, ProtocolMessage } from '../../../shared/protocol'
import type { Tone } from './Badge'
import { Badge } from './Badge'
import { Avatar } from './Avatar'

const KIND: Record<MessageKind, { tone: Tone; label: string }> = {
  chat: { tone: 'neutral', label: 'chat' },
  task: { tone: 'working', label: 'task' },
  result: { tone: 'success', label: 'result' },
  system: { tone: 'neutral', label: 'system' },
}

function time(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageItem({ message }: { message: ProtocolMessage }) {
  if (message.kind === 'system') {
    return (
      <li className="px-2 py-1.5 pl-11 text-xs text-muted">
        {message.senderName ? `${message.senderName} · ` : ''}
        {message.text}
      </li>
    )
  }

  const meta = KIND[message.kind]

  return (
    <li className="flex gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface">
      <Avatar name={message.senderName ?? '?'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[12.5px]">
          <span className="font-semibold">{message.senderName ?? 'unknown'}</span>
          {message.to ? <span className="text-faint">→ {message.to}</span> : null}
          <span className="font-mono text-[11px] text-faint">{time(message.ts)}</span>
          <span className="ml-auto">
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </span>
        </div>
        <p className="mt-0.5 text-[13px] whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    </li>
  )
}
