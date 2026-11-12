import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface Endpoint {
  port: number
  token: string
}

/** Where the running hub advertises itself so CLI/MCP clients can find it. */
export function defaultEndpointPath(channel = process.env.SYMFOLY_CHANNEL ?? 'production'): string {
  const base = process.env.SYMFOLY_HOME ?? join(homedir(), '.symfoly')
  const suffix = channel === 'production' ? '' : `-${channel}`
  return join(base, `endpoint${suffix}.json`)
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
