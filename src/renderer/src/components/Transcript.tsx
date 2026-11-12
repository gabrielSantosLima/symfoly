import { useEffect, useRef } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { roomLabel, roomTone } from '../lib/rooms'
import { buttonGhostClass } from '../lib/ui'
import { Badge } from './Badge'
import { MessageItem } from './MessageItem'

export function Transcript() {
  const { detail, setPaused, closeRoom } = useAppData()
  const endRef = useRef<HTMLDivElement>(null)
  const count = detail?.messages.length ?? 0

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [count])

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500 dark:text-slate-400">
        Select a room to watch the conversation.
      </div>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{detail.room.name}</h2>
            <Badge tone={roomTone(detail.room)}>{roomLabel(detail.room)}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {detail.participants.length
              ? detail.participants.map((participant) => participant.name).join(', ')
              : 'no participants'}{' '}
            · {detail.messages.length} message(s)
          </p>
        </div>
        {detail.room.status === 'open' ? (
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonGhostClass}
              onClick={() => void setPaused(!detail.room.paused)}
            >
              {detail.room.paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className={buttonGhostClass} onClick={() => void closeRoom()}>
              Close
            </button>
          </div>
        ) : null}
      </div>

      <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
        {detail.room.brief ? (
          <li className="rounded-md bg-slate-100 px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            brief: {detail.room.brief}
          </li>
        ) : null}
        {detail.messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {detail.messages.length === 0 && !detail.room.brief ? (
          <li className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</li>
        ) : null}
        <div ref={endRef} />
      </ol>
    </section>
  )
}
