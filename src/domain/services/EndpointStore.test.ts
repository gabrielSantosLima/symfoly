// @vitest-environment node
import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveEndpoint } from './EndpointStore'

const previousHome = process.env.SYMFOLY_HOME
const previousChannel = process.env.SYMFOLY_CHANNEL

afterEach(() => {
  if (previousHome === undefined) delete process.env.SYMFOLY_HOME
  else process.env.SYMFOLY_HOME = previousHome
  if (previousChannel === undefined) delete process.env.SYMFOLY_CHANNEL
  else process.env.SYMFOLY_CHANNEL = previousChannel
})

describe('resolveEndpoint', () => {
  it('picks the most recently updated endpoint when no channel is given', () => {
    const home = mkdtempSync(join(tmpdir(), 'symfoly-'))
    process.env.SYMFOLY_HOME = home
    delete process.env.SYMFOLY_CHANNEL

    const older = join(home, 'endpoint-beta.json')
    const newer = join(home, 'endpoint.json')
    writeFileSync(older, JSON.stringify({ port: 1, token: 'a' }))
    writeFileSync(newer, JSON.stringify({ port: 2, token: 'b' }))
    const past = new Date(Date.now() - 60_000)
    utimesSync(older, past, past)

    expect(resolveEndpoint()).toEqual({ port: 2, token: 'b' })
  })

  it('reads the channel-specific file when a channel is given', () => {
    const home = mkdtempSync(join(tmpdir(), 'symfoly-'))
    process.env.SYMFOLY_HOME = home
    writeFileSync(join(home, 'endpoint-beta.json'), JSON.stringify({ port: 7, token: 't' }))

    expect(resolveEndpoint('beta')).toEqual({ port: 7, token: 't' })
  })
})
