import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SymfolyApi } from '../../shared/api'
import App from './App'

function installApi(overrides: Partial<SymfolyApi> = {}): SymfolyApi {
  const api: SymfolyApi = {
    getVersion: vi.fn().mockResolvedValue('0.0.0'),
    listRooms: vi.fn().mockResolvedValue([]),
    createRoom: vi.fn(),
    closeRoom: vi.fn().mockResolvedValue(true),
    pauseRoom: vi.fn().mockResolvedValue(true),
    getRoomDetail: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      port: 4321,
      url: 'ws://127.0.0.1:4321',
      roomCount: 0,
      channel: 'production',
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
})
