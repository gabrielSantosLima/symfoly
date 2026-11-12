import { AppDataProvider, useAppData } from './contexts/AppDataContext'
import { useTheme } from './hooks/useTheme'
import { RoomsView } from './views/RoomsView'

function ThemedApp() {
  const { settings } = useAppData()
  useTheme(settings)
  return <RoomsView />
}

export default function App() {
  return (
    <AppDataProvider>
      <ThemedApp />
    </AppDataProvider>
  )
}
