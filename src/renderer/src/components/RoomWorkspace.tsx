import { useEffect, useRef, useState } from 'react'
import { MdClose, MdDelete, MdPause, MdPlayArrow } from 'react-icons/md'
import { useAppData } from '../contexts/AppDataContext'
import { roomLabel, roomTone } from '../lib/rooms'
import { buttonGhostClass } from '../lib/ui'
import { Badge } from './Badge'
import { Avatar } from './Avatar'
import { EditableTitle } from './EditableTitle'
import { Inspector } from './Inspector'
import { MessageItem } from './MessageItem'

type Tab = 'conversation' | 'agents'

export function RoomWorkspace() {
  const { detail, setPaused, closeRoom, deleteRoom, renameRoom, error } = useAppData()
  const [tab, setTab] = useState<Tab>('conversation')
  const endRef = useRef<HTMLDivElement>(null)
  const count = detail?.messages.length ?? 0

  useEffect(() => {
    if (tab === 'conversation') endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [count, tab])

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-app">
        {detail ? (
          <>
            <header className="flex items-start gap-3 px-5 pt-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <EditableTitle
                    value={detail.room.name}
                    label="Rename room"
                    onCommit={(next) => void renameRoom(detail.room.name, next)}
                  />
                  <Badge tone={roomTone(detail.room)}>{roomLabel(detail.room)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {detail.participants.length} member(s) · {detail.messages.length} message(s)
                </p>
                {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
              </div>
              <div className="ml-auto flex flex-none gap-1.5">
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
                    <button
                      type="button"
                      className={buttonGhostClass}
                      onClick={() => void closeRoom()}
                    >
                      <MdClose className="h-4 w-4" aria-hidden />
                      Close
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={`${buttonGhostClass} hover:border-transparent hover:bg-[var(--tint-danger)] hover:text-danger`}
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
            </header>

            <div className="mt-3 flex gap-1 border-b border-border px-5" role="tablist">
              {(['conversation', 'agents'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                    tab === id
                      ? 'border-brand text-fg'
                      : 'border-transparent text-muted hover:text-fg'
                  }`}
                >
                  {id === 'conversation' ? 'Conversation' : 'Agents'}
                </button>
              ))}
            </div>

            {tab === 'conversation' ? (
              <ol className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3 pl-5">
                {detail.room.brief ? (
                  <li className="mb-1 flex gap-2.5 rounded-lg border border-border bg-surface p-3">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                      Brief
                    </span>
                    <span className="text-[12.5px] text-muted">{detail.room.brief}</span>
                  </li>
                ) : null}
                {detail.messages.map((message) => (
                  <MessageItem key={message.id} message={message} />
                ))}
                {detail.messages.length === 0 && !detail.room.brief ? (
                  <li className="px-2 py-2 text-sm text-muted">No messages yet.</li>
                ) : null}
                <div ref={endRef} />
              </ol>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {detail.participants.length === 0 ? (
                  <p className="text-sm text-muted">No agents in this room yet.</p>
                ) : (
                  <ul className="flex max-w-2xl flex-col gap-1">
                    {detail.participants.map((participant) => (
                      <li
                        key={participant.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                      >
                        <Avatar
                          name={participant.name}
                          variant={participant.kind === 'human' ? 'human' : 'agent'}
                        />
                        <span className="font-semibold">{participant.name}</span>
                        <span className="text-xs text-muted">{participant.kind}</span>
                        <span className="ml-auto font-mono text-[11px] text-faint">
                          joined {new Date(participant.joinedAt).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mx-5 mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-muted">
              Only the human broadcasts here — agents write through MCP / CLI.
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
            Select a room to watch the conversation.
          </div>
        )}
      </div>

      <Inspector />
    </div>
  )
}
