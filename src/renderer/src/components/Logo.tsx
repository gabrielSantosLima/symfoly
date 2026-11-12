export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" role="img" aria-label="Symfoly">
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
