import { useState } from 'react'
import { MdCheck, MdContentCopy } from 'react-icons/md'

/** One-click copy to the clipboard, with a short confirmation. */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className="inline-flex h-6 flex-none items-center gap-1 rounded border border-border px-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1200)
        })
      }}
    >
      {copied ? (
        <MdCheck className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <MdContentCopy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? 'Copied' : label}
    </button>
  )
}
