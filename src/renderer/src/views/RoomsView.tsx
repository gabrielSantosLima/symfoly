import { useState } from 'react'
import { PlanPanel } from '../components/PlanPanel'
import { RoomsPane } from '../components/RoomsPane'
import { Transcript } from '../components/Transcript'

export function RoomsView() {
  const [tab, setTab] = useState<'chat' | 'plan'>('chat')

  return (
    <div className="flex min-h-0 flex-1">
      <RoomsPane />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {(['chat', 'plan'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-t-md px-3 py-1.5 text-sm font-medium ${
                tab === id ? 'border-b-2 border-brand text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {id === 'chat' ? 'Conversation' : 'Plan'}
            </button>
          ))}
        </div>
        {tab === 'chat' ? <Transcript /> : <PlanPanel />}
      </div>
    </div>
  )
}
