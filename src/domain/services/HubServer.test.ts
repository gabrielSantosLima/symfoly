// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { TestClient } from '../../testing/TestClient'
import { CloseRoomUseCase } from '../useCases/CloseRoomUseCase'
import { JoinRoomUseCase } from '../useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../useCases/SendMessageUseCase'
import { SetRoomPausedUseCase } from '../useCases/SetRoomPausedUseCase'
import { DeleteRoomUseCase } from '../useCases/DeleteRoomUseCase'
import { GetRoomStateUseCase } from '../useCases/GetRoomStateUseCase'
import { TaskUseCase } from '../useCases/TaskUseCase'
import { createHubServer, type HubHandle } from './HubServer'
import { RoomStore } from './RoomStore'

const TOKEN = 'test-token'
const hubs: HubHandle[] = []
const clients: TestClient[] = []

async function startHub(): Promise<{ url: string; hub: HubHandle }> {
  const rooms = new RoomStore()
  const hub = await createHubServer(
    {
      joinRoom: new JoinRoomUseCase(rooms),
      leaveRoom: new LeaveRoomUseCase(rooms),
      sendMessage: new SendMessageUseCase(rooms),
      receiveMessages: new ReceiveMessagesUseCase(rooms),
      listRooms: new ListRoomsUseCase(rooms),
      closeRoom: new CloseRoomUseCase(rooms),
      setRoomPaused: new SetRoomPausedUseCase(rooms),
      deleteRoom: new DeleteRoomUseCase(rooms),
      task: new TaskUseCase(rooms),
      getRoomState: new GetRoomStateUseCase(rooms),
    },
    { token: TOKEN, port: 0 },
  )
  hubs.push(hub)
  return { url: `ws://127.0.0.1:${hub.port}`, hub }
}

async function connect(url: string, name: string): Promise<TestClient> {
  const client = await TestClient.connect(url)
  clients.push(client)
  client.send({ type: 'hello', token: TOKEN, name, kind: 'agent' })
  await client.next('welcome')
  return client
}

async function join(client: TestClient, room: string): Promise<void> {
  client.send({ type: 'join', room })
  await client.next('room_state')
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()))
  await Promise.all(hubs.splice(0).map((hub) => hub.close()))
})

describe('HubServer', () => {
  it('rejects a client with a bad token', async () => {
    const { url } = await startHub()
    const client = await TestClient.connect(url)
    clients.push(client)
    client.send({ type: 'hello', token: 'wrong', name: 'x', kind: 'agent' })
    const error = await client.next('error')
    expect(error.code).toBe('unauthorized')
  })

  it('delivers a message to a waiting receiver', async () => {
    const { url } = await startHub()
    const a = await connect(url, 'a')
    const b = await connect(url, 'b')
    await join(a, 'r1')
    await join(b, 'r1')

    const receiving = b.next('received')
    b.send({ type: 'receive', room: 'r1', since: 0, requestId: 'req-1', wait: 5 })
    a.send({ type: 'send', room: 'r1', text: 'hello b' })

    const received = await receiving
    expect(received.requestId).toBe('req-1')
    expect(received.messages.map((message) => message.text)).toEqual(['hello b'])
    expect(received.messages[0].senderName).toBe('a')
  })

  it('never returns the caller its own messages', async () => {
    const { url } = await startHub()
    const a = await connect(url, 'a')
    await join(a, 'r1')
    a.send({ type: 'send', room: 'r1', text: 'mine' })
    await a.next('message')

    a.send({ type: 'receive', room: 'r1', since: 0, requestId: 'req-2', wait: 0 })
    const received = await a.next('received')
    expect(received.messages).toEqual([])
  })

  it('returns already-stored history', async () => {
    const { url } = await startHub()
    const a = await connect(url, 'a')
    const b = await connect(url, 'b')
    await join(a, 'r1')
    await join(b, 'r1')

    a.send({ type: 'send', room: 'r1', text: 'one' })
    await a.next('message')
    a.send({ type: 'send', room: 'r1', text: 'two' })
    await a.next('message')

    b.send({ type: 'receive', room: 'r1', since: 0, requestId: 'req-3', wait: 0 })
    const received = await b.next('received')
    expect(received.messages.map((message) => message.text)).toEqual(['one', 'two'])
  })

  it('broadcasts presence as agents join and leave', async () => {
    const { url } = await startHub()
    const a = await connect(url, 'a')
    await join(a, 'r1')

    const b = await connect(url, 'b')
    const joined = a.next('presence')
    await join(b, 'r1')
    expect((await joined).status).toBe('joined')

    const left = a.next('presence')
    b.send({ type: 'leave', room: 'r1' })
    const leftEvent = await left
    expect(leftEvent.status).toBe('left')
    expect(leftEvent.name).toBe('b')
  })

  it('rejects a send before joining', async () => {
    const { url } = await startHub()
    const a = await connect(url, 'a')
    a.send({ type: 'send', room: 'r1', text: 'nope' })
    const error = await a.next('error')
    expect(error.code).toBe('not_joined')
  })

  it('replies to ping', async () => {
    const { url } = await startHub()
    const a = await connect(url, 'a')
    a.send({ type: 'ping' })
    await expect(a.next('pong')).resolves.toBeDefined()
  })

  it('notifies participants when the human closes a room', async () => {
    const { url, hub } = await startHub()
    const a = await connect(url, 'a')
    await join(a, 'r1')

    const closed = a.next('closed')
    hub.closeRoom('r1')
    expect((await closed).room).toBe('r1')

    a.send({ type: 'send', room: 'r1', text: 'after close' })
    const error = await a.next('error')
    expect(error.code).toBe('room_closed')
  })

  it('announces a pause and blocks further sends', async () => {
    const { url, hub } = await startHub()
    const a = await connect(url, 'a')
    await join(a, 'r1')

    const paused = a.next('message')
    hub.setRoomPaused('r1', true)
    expect((await paused).message.kind).toBe('system')

    a.send({ type: 'send', room: 'r1', text: 'after pause' })
    const error = await a.next('error')
    expect(error.code).toBe('paused')
  })

  it('deletes a room and drops its participants', async () => {
    const { url, hub } = await startHub()
    const a = await connect(url, 'a')
    await join(a, 'r1')

    const closed = a.next('closed')
    hub.deleteRoom('r1')
    expect((await closed).room).toBe('r1')

    a.send({ type: 'send', room: 'r1', text: 'after delete' })
    const error = await a.next('error')
    expect(error.code).toBe('not_joined')
  })
})
