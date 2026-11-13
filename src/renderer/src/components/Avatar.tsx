const GRADIENTS = [
  'linear-gradient(150deg, #6a8dff, #4f6ef2)',
  'linear-gradient(150deg, #f0a64a, #e07b39)',
  'linear-gradient(150deg, #46c98d, #23976a)',
  'linear-gradient(150deg, #f2d16a, #d9a53a)',
  'linear-gradient(150deg, #f28fb0, #d95c86)',
  'linear-gradient(150deg, #8ad0f0, #3f9fd0)',
]

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  }
  return result
}

export type AvatarVariant = 'agent' | 'human' | 'ghost'

/** Deterministic coloured avatar with the participant's initial. */
export function Avatar({
  name,
  variant = 'agent',
  size = 24,
  title,
}: {
  name: string
  variant?: AvatarVariant
  size?: number
  title?: string
}) {
  const label = name.trim().slice(0, 1).toUpperCase() || '?'
  const background =
    variant === 'human'
      ? 'linear-gradient(150deg, #a78bfa, #7c5cf0)'
      : variant === 'ghost'
        ? 'var(--surface-3)'
        : GRADIENTS[hash(name) % GRADIENTS.length]

  return (
    <span
      title={title ?? name}
      aria-hidden
      className="grid flex-none place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background,
        color: variant === 'ghost' ? 'var(--muted)' : 'var(--brand-fg)',
      }}
    >
      {label}
    </span>
  )
}
