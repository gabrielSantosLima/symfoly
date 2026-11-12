import { useEffect, useRef } from 'react'
import { MdClose, MdDelete, MdPause, MdPlayArrow } from 'react-icons/md'
import { useAppData } from '../contexts/AppDataContext'
import { roomLabel, roomTone } from '../lib/rooms'
import { buttonGhostClass } from '../lib/ui'
import { Badge } from './Badge'
import { MessageItem } from './MessageItem'

export function Transcript() {
  const { detail, setPaused, closeRoom, deleteRoom } = useAppData()
  const endRef = useRef<HTMLDivElement>(null)
  const count = detail?.messages.length ?? 0

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [count])

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        Select a room to watch the conversation.
      </div>
    )
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-app">
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{detail.room.name}</h2>
            <Badge tone={roomTone(detail.room)}>{roomLabel(detail.room)}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {detail.participants.length
              ? detail.participants.map((participant) => participant.name).join(', ')
              : 'no participants'}{' '}
            · {detail.messages.length} message(s)
          </p>
        </div>
        <div className="flex gap-2">
          {detail.room.status === 'open' ? (
            <>
              <button
                type="button"
                className={buttonGhostClass}
                onClick={() => void setPaused(!detail.room.paused)}
              >
                {detail.room.paused ? (
                  <MdPlayArrow className="h-4 w-4" aria-hidden />
                ) : (
                  <MdPause className="h-4 w-4" aria-hidden />
                )}
                {detail.room.paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className={buttonGhostClass} onClick={() => void closeRoom()}>
                <MdClose className="h-4 w-4" aria-hidden />
                Close
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={buttonGhostClass}
            onClick={() => {
              if (window.confirm(`Delete room "${detail.room.name}" and its history?`)) {
                void deleteRoom()
              }
            }}
          >
            <MdDelete className="h-4 w-4" aria-hidden />
            Delete
          </button>
        </div>
      </div>

      <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
        {detail.room.brief ? (
          <li className="rounded-md bg-surface-2 px-3 py-2 text-sm italic text-muted">
            brief: {detail.room.brief}
          </li>
        ) : null}
        {detail.messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {detail.messages.length === 0 && !detail.room.brief ? (
          <li className="text-sm text-muted">No messages yet.</li>
        ) : null}
        <div ref={endRef} />
      </ol>
    </section>
  )
}
