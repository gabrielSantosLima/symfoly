import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SymfolyApi } from '../../shared/api'
import type { HubEvent } from '../../shared/ipc'
import App from './App'

function installApi(overrides: Partial<SymfolyApi> = {}): SymfolyApi {
  const api: SymfolyApi = {
    getVersion: vi.fn().mockResolvedValue('0.0.0'),
    listRooms: vi.fn().mockResolvedValue([]),
    createRoom: vi.fn(),
    closeRoom: vi.fn().mockResolvedValue(true),
    pauseRoom: vi.fn().mockResolvedValue(true),
    deleteRoom: vi.fn().mockResolvedValue(true),
    renameRoom: vi.fn().mockResolvedValue(true),
    setPhase: vi.fn().mockResolvedValue(true),
    getRoomDetail: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      port: 4321,
      url: 'ws://127.0.0.1:4321',
      roomCount: 0,
      channel: 'production',
      connect: {
        launcher: '/home/.symfoly/bin/symfoly-mcp.cmd',
        cliLauncher: '/home/.symfoly/bin/symfoly.cmd',
        mcpPath: '/app/resources/mcp.mjs',
        cliPath: '/app/resources/symfoly.mjs',
        skillsPath: '/app/agent-skills',
        home: '/home/.symfoly',
      },
    }),
    getSettings: vi.fn().mockResolvedValue({
      theme: 'system',
      retentionMessagesPerRoom: 1000,
      launchAtLogin: false,
    }),
    saveSettings: vi.fn().mockResolvedValue({
      theme: 'system',
      retentionMessagesPerRoom: 1000,
      launchAtLogin: false,
    }),
    setupAgents: vi.fn().mockResolvedValue([]),
    onEvent: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  }
  window.symfoly = api
  return api
}

describe('App', () => {
  it('renders the product name and the hub status', async () => {
    installApi()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Symfoly' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/127\.0\.0\.1:4321/)).toBeInTheDocument())
  })

  it('lists the rooms returned by the API', async () => {
    installApi({
      listRooms: vi.fn().mockResolvedValue([
        {
          id: 'plan',
          name: 'plan',
          status: 'open',
          createdBy: 'human',
          createdAt: 1,
        },
      ]),
    })
    render(<App />)
    expect(await screen.findByText('plan')).toBeInTheDocument()
  })

  it('shows ready-to-copy agent config on the Connect view', async () => {
    installApi()
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Connect/ }))
    expect((await screen.findAllByText(/mcpServers/)).length).toBeGreaterThan(0)
  })

  it('flips the theme with a single click', async () => {
    const api = installApi()
    render(<App />)
    fireEvent.click(await screen.findByTitle('Toggle theme'))
    await waitFor(() => expect(api.saveSettings).toHaveBeenCalledWith({ theme: 'dark' }))
  })

  it('creates a generically named room when New room is clicked', async () => {
    const createRoom = vi.fn().mockResolvedValue({
      id: 'new-room',
      name: 'new-room',
      status: 'open',
      createdBy: 'human',
      createdAt: 1,
    })
    installApi({ createRoom })
    render(<App />)
    const [newRoom] = await screen.findAllByRole('button', { name: 'New room' })
    fireEvent.click(newRoom)
    await waitFor(() => expect(createRoom).toHaveBeenCalled())
    expect(createRoom).toHaveBeenCalledTimes(1)
    expect(createRoom.mock.calls[0][0]).toMatchObject({ name: 'new-room' })
  })

  it('avoids clashing with an existing generic room name', async () => {
    const createRoom = vi.fn().mockResolvedValue({
      id: 'new-room-2',
      name: 'new-room-2',
      status: 'open',
      createdBy: 'human',
      createdAt: 1,
    })
    installApi({
      listRooms: vi.fn().mockResolvedValue([
        {
          id: 'new-room',
          name: 'new-room',
          status: 'open',
          createdBy: 'human',
          createdAt: 1,
        },
      ]),
      createRoom,
    })
    render(<App />)
    await screen.findByText('new-room')
    const [newRoom] = await screen.findAllByRole('button', { name: 'New room' })
    fireEvent.click(newRoom)
    await waitFor(() => expect(createRoom).toHaveBeenCalled())
    expect(createRoom.mock.calls[0][0]).toMatchObject({ name: 'new-room-2' })
  })

  it('renames a room inline from its title', async () => {
    const api = installApi({
      listRooms: vi
        .fn()
        .mockResolvedValue([
          { id: 'r1', name: 'r1', status: 'open', createdBy: 'human', createdAt: 1 },
        ]),
      getRoomDetail: vi.fn().mockResolvedValue({
        room: {
          id: 'r1',
          name: 'r1',
          status: 'open',
          phase: 'planning',
          createdBy: 'human',
          createdAt: 1,
        },
        participants: [],
        messages: [],
        tasks: [],
        acks: [],
        floor: { holder: null },
        metrics: {
          messages: 0,
          tasks: 0,
          verified: 0,
          conflicts: 0,
          escalations: 0,
          convergenceMs: null,
        },
      }),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /r1 open/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'r1' }))

    const input = screen.getByLabelText('Rename room')
    fireEvent.change(input, { target: { value: 'r2' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(api.renameRoom).toHaveBeenCalledWith('r1', 'r2'))
  })

  it('re-selects the renamed room when the hub reports a rename', async () => {
    const handlers: ((event: HubEvent) => void)[] = []
    const base = {
      status: 'open' as const,
      phase: 'planning' as const,
      createdBy: 'human',
      createdAt: 1,
    }
    installApi({
      listRooms: vi.fn().mockResolvedValue([{ id: 'r1', name: 'r1', ...base }]),
      getRoomDetail: vi.fn().mockImplementation(async (id: string) => ({
        room: { id, name: id, ...base },
        participants: [],
        messages: [],
        tasks: [],
        acks: [],
        floor: { holder: null },
        metrics: {
          messages: 0,
          tasks: 0,
          verified: 0,
          conflicts: 0,
          escalations: 0,
          convergenceMs: null,
        },
      })),
      onEvent: (handler) => {
        handlers.push(handler)
        return () => {}
      },
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /r1 open/i }))
    expect(await screen.findByRole('button', { name: 'r1' })).toBeInTheDocument()

    act(() => {
      for (const handler of handlers) handler({ type: 'renamed', from: 'r1', to: 'r2' })
    })

    expect(await screen.findByRole('button', { name: 'r2' })).toBeInTheDocument()
  })

  it('filters the room list from the top bar search', async () => {
    const base = { status: 'open' as const, createdBy: 'human', createdAt: 1 }
    installApi({
      listRooms: vi.fn().mockResolvedValue([
        { id: 'alpha', name: 'alpha', ...base },
        { id: 'beta', name: 'beta', ...base },
      ]),
    })
    render(<App />)
    await screen.findByText('alpha')

    fireEvent.change(screen.getByLabelText('Search rooms'), { target: { value: 'bet' } })

    await waitFor(() => expect(screen.queryByText('alpha')).not.toBeInTheDocument())
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('shows pending asks in the inspector', async () => {
    installApi({
      listRooms: vi
        .fn()
        .mockResolvedValue([
          { id: 'r1', name: 'r1', status: 'open', createdBy: 'human', createdAt: 1 },
        ]),
      getRoomDetail: vi.fn().mockResolvedValue({
        room: {
          id: 'r1',
          name: 'r1',
          status: 'open',
          phase: 'planning',
          createdBy: 'human',
          createdAt: 1,
        },
        participants: [],
        messages: [],
        tasks: [],
        acks: [
          {
            id: 'm1',
            room: 'r1',
            from: 'a',
            to: 'b',
            createdAt: 1,
            deadlineAt: Date.now() + 30_000,
            status: 'pending',
          },
        ],
        floor: { holder: null },
        metrics: {
          messages: 0,
          tasks: 0,
          verified: 0,
          conflicts: 0,
          escalations: 0,
          convergenceMs: null,
        },
      }),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /r1 open/i }))
    expect(await screen.findByText('Waiting on')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  it('shows the room phase and advances it from the header', async () => {
    const api = installApi({
      listRooms: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          name: 'r1',
          status: 'open',
          phase: 'planning',
          createdBy: 'human',
          createdAt: 1,
        },
      ]),
      getRoomDetail: vi.fn().mockResolvedValue({
        room: {
          id: 'r1',
          name: 'r1',
          status: 'open',
          phase: 'planning',
          createdBy: 'human',
          createdAt: 1,
        },
        participants: [],
        messages: [],
        tasks: [],
        acks: [],
        floor: { holder: null },
        metrics: {
          messages: 0,
          tasks: 0,
          verified: 0,
          conflicts: 0,
          escalations: 0,
          convergenceMs: null,
        },
      }),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /r1 open/i }))

    fireEvent.click(await screen.findByRole('button', { name: 'executing' }))
    await waitFor(() => expect(api.setPhase).toHaveBeenCalledWith('r1', 'executing'))
  })

  it('shows coordination metrics in the inspector', async () => {
    installApi({
      listRooms: vi.fn().mockResolvedValue([
        {
          id: 'r1',
          name: 'r1',
          status: 'open',
          phase: 'planning',
          createdBy: 'human',
          createdAt: 1,
        },
      ]),
      getRoomDetail: vi.fn().mockResolvedValue({
        room: {
          id: 'r1',
          name: 'r1',
          status: 'open',
          phase: 'planning',
          createdBy: 'human',
          createdAt: 1,
        },
        participants: [],
        messages: [],
        tasks: [],
        acks: [],
        floor: { holder: null },
        metrics: {
          messages: 4,
          tasks: 2,
          verified: 1,
          conflicts: 3,
          escalations: 1,
          convergenceMs: 62_000,
        },
      }),
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /r1 open/i }))

    expect(await screen.findByText('Coordination')).toBeInTheDocument()
    expect(screen.getByText('Conflicts avoided')).toBeInTheDocument()
    expect(screen.getByText('1m 2s')).toBeInTheDocument()
  })
})
