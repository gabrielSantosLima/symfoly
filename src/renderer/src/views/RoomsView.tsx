import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { Transcript } from '../components/Transcript'

export function RoomsView() {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <Transcript />
      </div>
    </div>
  )
}
