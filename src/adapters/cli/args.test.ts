// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseArgs } from './args'

describe('parseArgs', () => {
  it('separates the command and positionals', () => {
    expect(parseArgs(['rooms'])).toEqual({ command: 'rooms', positionals: [], flags: {} })
  })

  it('parses string and boolean flags', () => {
    const parsed = parseArgs(['send', 'r1', 'hello', 'world', '--to', 'b', '--expects-reply'])
    expect(parsed.command).toBe('send')
    expect(parsed.positionals).toEqual(['r1', 'hello', 'world'])
    expect(parsed.flags).toEqual({ to: 'b', 'expects-reply': true })
  })

  it('treats a flag followed by another flag as boolean', () => {
    const parsed = parseArgs(['receive', 'r1', '--all', '--wait', '2'])
    expect(parsed.flags).toEqual({ all: true, wait: '2' })
  })
})
