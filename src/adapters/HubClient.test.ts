// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createHubServer, type HubHandle } from '../domain/services/HubServer'
import { RoomStore } from '../domain/services/RoomStore'
import { CloseRoomUseCase } from '../domain/useCases/CloseRoomUseCase'
import { JoinRoomUseCase } from '../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../domain/useCases/SendMessageUseCase'
import { HubClient } from './HubClient'

const TOKEN = 'test-token'
const hubs: HubHandle[] = []
const clients: HubClient[] = []

async function startHub(): Promise<string> {
  const rooms = new RoomStore()
  const hub = await createHubServer(
    {
      joinRoom: new JoinRoomUseCase(rooms),
      leaveRoom: new LeaveRoomUseCase(rooms),
      sendMessage: new SendMessageUseCase(rooms),
      receiveMessages: new ReceiveMessagesUseCase(rooms),
      listRooms: new ListRoomsUseCase(rooms),
      closeRoom: new CloseRoomUseCase(rooms),
    },
    { token: TOKEN, port: 0 },
  )
  hubs.push(hub)
  return `ws://127.0.0.1:${hub.port}`
}

async function connect(url: string, name: string): Promise<HubClient> {
  const client = await HubClient.connect({ url, token: TOKEN, name })
  clients.push(client)
  return client
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()))
  await Promise.all(hubs.splice(0).map((hub) => hub.close()))
})

describe('HubClient (two fake agents)', () => {
  it('lets two agents divide a task and share a result', async () => {
    const url = await startHub()
    const a = await connect(url, 'a')
    const b = await connect(url, 'b')

    await a.join('plan')
    await b.join('plan')

    const waitingForA = b.receive({ room: 'plan', since: 0, wait: 3 })
    a.send({ room: 'plan', text: 'you take the parser, I take the renderer' })
    const assignment = await waitingForA
    expect(assignment.map((message) => message.text)).toEqual([
      'you take the parser, I take the renderer',
    ])

    b.send({ room: 'plan', text: 'parser done', kind: 'result', done: true })
    const result = await a.receive({ room: 'plan', since: 1, wait: 3 })
    expect(result.map((message) => message.text)).toEqual(['parser done'])
    expect(result[0]?.kind).toBe('result')
  })

  it('resolves receive with an empty list after the wait window', async () => {
    const url = await startHub()
    const a = await connect(url, 'a')
    await a.join('quiet')
    const messages = await a.receive({ room: 'quiet', since: 0, wait: 1 })
    expect(messages).toEqual([])
  })

  it('lists rooms', async () => {
    const url = await startHub()
    const a = await connect(url, 'a')
    await a.join('r1')
    const rooms = await a.rooms()
    expect(rooms.map((room) => room.name)).toContain('r1')
  })
})
