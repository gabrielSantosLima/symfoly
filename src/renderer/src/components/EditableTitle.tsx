import { useEffect, useRef, useState } from 'react'

/** Click-to-edit title (Commit on Enter/blur, cancel on Escape). */
export function EditableTitle({
  value,
  onCommit,
  label = 'Rename',
}: {
  value: string
  onCommit: (next: string) => void
  label?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!editing) {
    return (
      <h2 className="min-w-0 text-[17px] font-bold tracking-tight">
        <button
          type="button"
          title={label}
          onClick={() => setEditing(true)}
          className="-mx-1 max-w-full truncate rounded px-1 text-left hover:bg-surface-2"
        >
          {value}
        </button>
      </h2>
    )
  }

  const commit = (): void => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    else setDraft(value)
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
      className="-mx-1 w-full max-w-[360px] rounded border border-brand bg-surface px-1 text-[17px] font-bold tracking-tight outline-none"
    />
  )
}
