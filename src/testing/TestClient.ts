import { WebSocket } from 'ws'
import type { ClientMessage, HubMessage } from '../shared/protocol'

type HubMessageOf<T extends HubMessage['type']> = Extract<HubMessage, { type: T }>

interface Waiter {
  match: (message: HubMessage) => boolean
  resolve: (message: HubMessage) => void
  timer: NodeJS.Timeout
}

/** Minimal generic client used by tests and the two-agent simulation. */
export class TestClient {
  private readonly ws: WebSocket
  private readonly inbox: HubMessage[] = []
  private readonly waiters: Waiter[] = []

  private constructor(url: string) {
    this.ws = new WebSocket(url)
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as HubMessage
      const index = this.waiters.findIndex((waiter) => waiter.match(message))
      if (index >= 0) {
        const [waiter] = this.waiters.splice(index, 1)
        clearTimeout(waiter.timer)
        waiter.resolve(message)
      } else {
        this.inbox.push(message)
      }
    })
  }

  static connect(url: string): Promise<TestClient> {
    const client = new TestClient(url)
    return new Promise((resolve, reject) => {
      client.ws.once('open', () => resolve(client))
      client.ws.once('error', reject)
    })
  }

  send(message: ClientMessage): void {
    this.ws.send(JSON.stringify(message))
  }

  next<T extends HubMessage['type']>(type: T, timeoutMs = 2000): Promise<HubMessageOf<T>> {
    return new Promise((resolve, reject) => {
      const queued = this.inbox.findIndex((message) => message.type === type)
      if (queued >= 0) {
        const [message] = this.inbox.splice(queued, 1)
        resolve(message as HubMessageOf<T>)
        return
      }
      const timer = setTimeout(() => {
        const at = this.waiters.findIndex((waiter) => waiter.timer === timer)
        if (at >= 0) this.waiters.splice(at, 1)
        reject(new Error(`timeout waiting for "${type}"`))
      }, timeoutMs)
      this.waiters.push({
        match: (message) => message.type === type,
        resolve: (message) => resolve(message as HubMessageOf<T>),
        timer,
      })
    })
  }

  close(): Promise<void> {
    if (this.ws.readyState === WebSocket.CLOSED) return Promise.resolve()
    return new Promise((resolve) => {
      this.ws.once('close', () => resolve())
      this.ws.close()
    })
  }
}
