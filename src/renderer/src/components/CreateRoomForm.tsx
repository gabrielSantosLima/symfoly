import { useState } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import { buttonClass, inputClass } from '../lib/ui'

export function CreateRoomForm() {
  const { createRoom, error } = useAppData()
  const [name, setName] = useState('')
  const [brief, setBrief] = useState('')

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void createRoom(name, brief).then(() => {
          setName('')
          setBrief('')
        })
      }}
    >
      <input
        aria-label="Room name"
        placeholder="room name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={inputClass}
      />
      <input
        aria-label="Brief"
        placeholder="brief (optional)"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        className={inputClass}
      />
      <button type="submit" className={buttonClass}>
        Create room
      </button>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </form>
  )
}
