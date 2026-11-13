// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createHubServer, type HubHandle } from '../../domain/services/HubServer'
import { RoomStore } from '../../domain/services/RoomStore'
import { CloseRoomUseCase } from '../../domain/useCases/CloseRoomUseCase'
import { JoinRoomUseCase } from '../../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../../domain/useCases/SendMessageUseCase'
import { SetRoomPausedUseCase } from '../../domain/useCases/SetRoomPausedUseCase'
import { DeleteRoomUseCase } from '../../domain/useCases/DeleteRoomUseCase'
import { RenameRoomUseCase } from '../../domain/useCases/RenameRoomUseCase'
import { GetRoomStateUseCase } from '../../domain/useCases/GetRoomStateUseCase'
import { TaskUseCase } from '../../domain/useCases/TaskUseCase'
import { HubClient } from '../HubClient'
import { SymfolyTools } from './tools'

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
      setRoomPaused: new SetRoomPausedUseCase(rooms),
      deleteRoom: new DeleteRoomUseCase(rooms),
      renameRoom: new RenameRoomUseCase(rooms),
      task: new TaskUseCase(rooms),
      getRoomState: new GetRoomStateUseCase(rooms),
    },
    { token: TOKEN, port: 0 },
  )
  hubs.push(hub)
  return `ws://127.0.0.1:${hub.port}`
}

async function agent(url: string, name: string): Promise<SymfolyTools> {
  const client = await HubClient.connect({ url, token: TOKEN, name })
  clients.push(client)
  return new SymfolyTools(client)
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()))
  await Promise.all(hubs.splice(0).map((hub) => hub.close()))
})

describe('SymfolyTools', () => {
  it('lets two agents exchange task and result', async () => {
    const url = await startHub()
    const a = await agent(url, 'a')
    const b = await agent(url, 'b')

    await a.join('plan')
    await b.join('plan')
    await a.send({ room: 'plan', kind: 'task', text: 'you take the parser' })

    const assignment = await b.receive({ room: 'plan', waitSeconds: 3 })
    expect(assignment.map((message) => message.text)).toEqual(['you take the parser'])
    expect(assignment[0]?.kind).toBe('task')

    await b.send({ room: 'plan', kind: 'result', text: 'parser done', done: true })
    const result = await a.receive({ room: 'plan', waitSeconds: 3 })
    expect(result.map((message) => message.text)).toEqual(['parser done'])
  })

  it('advances the cursor so messages are not returned twice', async () => {
    const url = await startHub()
    const a = await agent(url, 'a')
    const b = await agent(url, 'b')
    await a.join('r1')
    await b.join('r1')

    await a.send({ room: 'r1', text: 'first' })
    expect((await b.receive({ room: 'r1', waitSeconds: 3 })).map((m) => m.text)).toEqual(['first'])
    expect(await b.receive({ room: 'r1', waitSeconds: 1 })).toEqual([])
  })

  it('joins automatically when sending', async () => {
    const url = await startHub()
    const a = await agent(url, 'a')
    const b = await agent(url, 'b')
    await b.join('r2')

    await a.send({ room: 'r2', text: 'hi from a' })
    const received = await b.receive({ room: 'r2', waitSeconds: 3 })
    expect(received.map((message) => message.senderName)).toEqual(['a'])
  })

  it('lists rooms', async () => {
    const url = await startHub()
    const a = await agent(url, 'a')
    await a.join('r3')
    expect((await a.listRooms()).map((room) => room.name)).toContain('r3')
  })
})
