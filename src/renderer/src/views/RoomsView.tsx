import { RoomsPane } from '../components/RoomsPane'
import { Transcript } from '../components/Transcript'

export function RoomsView() {
  return (
    <div className="flex min-h-0 flex-1">
      <RoomsPane />
      <Transcript />
    </div>
  )
}
