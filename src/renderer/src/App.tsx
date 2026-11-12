import { useEffect, useState } from 'react'

const AGENTS = ['alpha', 'bravo', 'charlie']

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
  const [version, setVersion] = useState('')
  const [message, setMessage] = useState('')
  const [log, setLog] = useState<string[]>([])

  useEffect(() => {
    window.symfoly
      ?.getVersion()
      .then(setVersion)
      .catch(() => setVersion(''))
  }, [])

  function broadcast(): void {
    const text = message.trim()
    if (!text) return
    setLog((entries) => [`broadcast -> ${AGENTS.join(', ')}: ${text}`, ...entries])
    setMessage('')
  }

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Symfoly</h1>
        <p>Broadcast messages between agents.</p>
        {version ? <span className="version">v{version}</span> : null}
      </header>

      <section className="compose">
        <input
          aria-label="Message"
          placeholder="Type a message to broadcast"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') broadcast()
          }}
        />
        <button type="button" onClick={broadcast}>
          Broadcast
        </button>
      </section>

      <section className="log" aria-label="Broadcast log">
        {log.length === 0 ? (
          <p className="empty">No messages yet.</p>
        ) : (
          <ul>
            {log.map((entry, index) => (
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
