import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { symfolyHome } from './paths'

export interface Endpoint {
  port: number
  token: string
}

/** Endpoint file for a channel (production has no suffix). */
export function defaultEndpointPath(channel = process.env.SYMFOLY_CHANNEL ?? 'production'): string {
  const suffix = channel === 'production' ? '' : `-${channel}`
  return join(symfolyHome(), `endpoint${suffix}.json`)
}

/**
 * Finds the endpoint of a running hub. With a channel, reads that file; without
 * one, picks the most recently updated `endpoint*.json`, so CLI/MCP clients do
 * not need to know the channel.
 */
export function resolveEndpoint(channel = process.env.SYMFOLY_CHANNEL): Endpoint | undefined {
  if (channel) return new EndpointStore(defaultEndpointPath(channel)).load()

  const base = symfolyHome()
  if (!existsSync(base)) return undefined
  const candidates = readdirSync(base)
    .filter((name) => /^endpoint.*\.json$/.test(name))
    .map((name) => ({ path: join(base, name), mtime: statSync(join(base, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const candidate of candidates) {
    const endpoint = new EndpointStore(candidate.path).load()
    if (endpoint) return endpoint
  }
  return undefined
}

export class EndpointStore {
  constructor(private readonly filePath: string = defaultEndpointPath()) {}

  save(endpoint: Endpoint): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, `${JSON.stringify(endpoint, null, 2)}\n`)
  }

  load(): Endpoint | undefined {
    if (!existsSync(this.filePath)) return undefined
    try {
      const data = JSON.parse(readFileSync(this.filePath, 'utf8')) as Partial<Endpoint>
      if (typeof data.port === 'number' && typeof data.token === 'string') {
        return { port: data.port, token: data.token }
      }
    } catch {
      /* fall through */
    }
    return undefined
  }

  clear(): void {
    rmSync(this.filePath, { force: true })
  }
}
