import { useState } from 'react'
import { NavRail } from './components/NavRail'
import { AppDataProvider, useAppData } from './contexts/AppDataContext'
import { useTheme } from './hooks/useTheme'
import type { View } from './lib/ui'
import { AboutView } from './views/AboutView'
import { AgentsView } from './views/AgentsView'
import { RoomsView } from './views/RoomsView'
import { SettingsView } from './views/SettingsView'

function Shell() {
  const { settings } = useAppData()
  const [view, setView] = useState<View>('rooms')
  useTheme(settings)

  return (
    <div className="flex h-full">
      <NavRail view={view} onChange={setView} />
      <main className="flex min-h-0 flex-1 flex-col">
        {view === 'rooms' ? <RoomsView /> : null}
        {view === 'agents' ? <AgentsView /> : null}
        {view === 'settings' ? <SettingsView /> : null}
        {view === 'about' ? <AboutView /> : null}
      </main>
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
