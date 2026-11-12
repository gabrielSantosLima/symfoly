// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CreateRoomUseCase } from '../useCases/CreateRoomUseCase'
import { JoinRoomUseCase } from '../useCases/JoinRoomUseCase'
import { SendMessageUseCase } from '../useCases/SendMessageUseCase'
import { Persistence } from './Persistence'
import { RoomStore } from './RoomStore'

function tempFile(): string {
  return join(mkdtempSync(join(tmpdir(), 'symfoly-')), 'store.json')
}

function populated(): RoomStore {
  const rooms = new RoomStore()
  new CreateRoomUseCase(rooms).execute({ name: 'r1', createdBy: 'human', brief: 'goal' })
  new JoinRoomUseCase(rooms).execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
  new SendMessageUseCase(rooms).execute({
    room: 'r1',
    senderId: 's1',
    senderName: 'a',
    text: 'hello',
    kind: 'task',
  })
  return rooms
}

describe('Persistence', () => {
  it('round-trips a store snapshot through a file', () => {
    const file = tempFile()
    const rooms = populated()

    const persistence = new Persistence(file)
    persistence.schedule(rooms.snapshot())
    persistence.flush()

    const loaded = new Persistence(file).load()
    if (!loaded) throw new Error('expected a snapshot on disk')

    const restored = new RoomStore()
    restored.restore(loaded)

    expect(restored.get('r1')?.brief).toBe('goal')
    expect(restored.participantsOf('r1').map((p) => p.name)).toEqual(['a'])
    const messages = restored.history('r1')
    expect(messages.map((m) => m.text)).toEqual(['hello'])
    expect(messages[0]?.kind).toBe('task')
  })

  it('returns undefined when the file does not exist', () => {
    expect(new Persistence(tempFile()).load()).toBeUndefined()
  })
})
