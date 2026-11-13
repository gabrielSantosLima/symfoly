import { useState } from 'react'
import { RoomWorkspace } from './components/RoomWorkspace'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { AppDataProvider, useAppData } from './contexts/AppDataContext'
import { useTheme } from './hooks/useTheme'
import type { View } from './lib/ui'
import { AboutView } from './views/AboutView'
import { AgentsView } from './views/AgentsView'
import { ConnectView } from './views/ConnectView'
import { SettingsView } from './views/SettingsView'

function Shell() {
  const { settings } = useAppData()
  const [view, setView] = useState<View>('rooms')
  const [query, setQuery] = useState('')
  const theme = useTheme(settings)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TopBar theme={theme} query={query} onQuery={setQuery} />
      <div className="flex min-h-0 flex-1">
        <Sidebar view={view} onNavigate={setView} query={query} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {view === 'rooms' ? <RoomWorkspace onNavigate={setView} /> : null}
          {view === 'agents' ? <AgentsView onNavigate={setView} /> : null}
          {view === 'connect' ? <ConnectView onNavigate={setView} /> : null}
          {view === 'settings' ? <SettingsView /> : null}
          {view === 'about' ? <AboutView /> : null}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppDataProvider>
      <Shell />
    </AppDataProvider>
  )
}
