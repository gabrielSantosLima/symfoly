import { useEffect, useState } from 'react'

const AGENTS = ['alpha', 'bravo', 'charlie']

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
