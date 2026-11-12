import { useCallback, useEffect, useState } from 'react'
import type { HubEvent, HubStatus } from '../../shared/ipc'
import type { RoomDetail, RoomInfo } from '../../shared/protocol'

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" fill="none" role="img" aria-label="Symfoly">
      <g stroke="currentColor" strokeWidth="4" strokeLinecap="round">
        <path d="M32 32 32 13" />
        <path d="M32 32 16 42" />
        <path d="M32 32 48 42" />
      </g>
      <circle cx="32" cy="13" r="5" fill="currentColor" />
      <circle cx="16" cy="42" r="5" fill="currentColor" />
      <circle cx="48" cy="42" r="5" fill="currentColor" />
      <circle cx="32" cy="32" r="8" fill="currentColor" />
    </svg>
  )
}

export default function App() {
  const api = window.symfoly
  const [version, setVersion] = useState('')
  const [status, setStatus] = useState<HubStatus | null>(null)
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [name, setName] = useState('')
  const [brief, setBrief] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!api) return
    setRooms(await api.listRooms())
    setStatus(await api.getStatus())
  }, [api])

  const loadDetail = useCallback(
    async (room: string) => {
      if (!api) return
      setDetail((await api.getRoomDetail(room)) ?? null)
    },
    [api],
  )

  useEffect(() => {
    if (!api) return
    void api
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion(''))
    void refresh()
    return api.onEvent((event: HubEvent) => {
      if (event.type === 'message') {
        const message = event.message
        setDetail((current) =>
          current && current.room.name === message.room
            ? { ...current, messages: [...current.messages, message] }
            : current,
        )
      } else {
        void refresh()
      }
    })
  }, [api, refresh])

  useEffect(() => {
    if (selected) void loadDetail(selected)
    else setDetail(null)
  }, [selected, loadDetail])

  async function create(): Promise<void> {
    if (!api || !name.trim()) return
    try {
      setError('')
      const room = await api.createRoom({ name: name.trim(), brief: brief.trim() || undefined })
      setName('')
      setBrief('')
      await refresh()
      setSelected(room.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function close(): Promise<void> {
    if (!api || !selected) return
    await api.closeRoom(selected)
    await refresh()
    await loadDetail(selected)
  }

  async function setPaused(paused: boolean): Promise<void> {
    if (!api || !selected) return
    await api.pauseRoom(selected, paused)
    await refresh()
    await loadDetail(selected)
  }

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Symfoly</h1>
        <p>Watch agents collaborate in rooms.</p>
        <span className="version">{version ? `v${version}` : ''}</span>
      </header>

      <div className="status">
        {status ? `hub ${status.url} · ${status.roomCount} room(s)` : 'connecting to hub…'}
      </div>

      <div className="layout">
        <aside className="rooms">
          <form
            className="create"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <input
              aria-label="Room name"
              placeholder="room name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              aria-label="Brief"
              placeholder="brief (optional)"
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
            />
            <button type="submit">Create room</button>
          </form>

          {error ? <p className="error">{error}</p> : null}

          <ul className="room-list">
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className={room.id === selected ? 'active' : ''}
                  onClick={() => setSelected(room.id)}
                >
                  <span className="room-name">{room.name}</span>
                  <span className={`badge ${room.paused ? 'paused' : room.status}`}>
                    {room.paused ? 'paused' : room.status}
                  </span>
                </button>
              </li>
            ))}
            {rooms.length === 0 ? <li className="empty">No rooms yet.</li> : null}
          </ul>
        </aside>

        <section className="transcript">
          {detail ? (
            <>
              <div className="transcript-header">
                <div>
                  <strong>{detail.room.name}</strong>
                  <span className={`badge ${detail.room.paused ? 'paused' : detail.room.status}`}>
                    {detail.room.paused ? 'paused' : detail.room.status}
                  </span>
                  <div className="participants">
                    {detail.participants.length
                      ? detail.participants.map((participant) => participant.name).join(', ')
                      : 'no participants'}
                    {` · ${detail.messages.length} message(s)`}
                  </div>
                </div>
                {detail.room.status === 'open' ? (
                  <div className="actions">
                    <button type="button" onClick={() => void setPaused(!detail.room.paused)}>
                      {detail.room.paused ? 'Resume' : 'Pause'}
                    </button>
                    <button type="button" onClick={() => void close()}>
                      Close room
                    </button>
                  </div>
                ) : null}
              </div>

              <ol className="messages">
                {detail.room.brief ? <li className="system">brief: {detail.room.brief}</li> : null}
                {detail.messages.map((message) => (
                  <li key={message.id} className={message.kind}>
                    <span className="sender">{message.senderName}</span>
                    {message.to ? <span className="to">→ {message.to}</span> : null}
                    <span className="kind">{message.kind}</span>
                    <span className="text">{message.text}</span>
                  </li>
                ))}
                {detail.messages.length === 0 && !detail.room.brief ? (
                  <li className="empty">No messages yet.</li>
                ) : null}
              </ol>
            </>
          ) : (
            <p className="empty">Select a room to watch the conversation.</p>
          )}
        </section>
      </div>
    </div>
  )
}
