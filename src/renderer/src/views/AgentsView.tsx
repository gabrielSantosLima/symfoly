import { MdCable } from 'react-icons/md'
import { ViewHeader } from '../components/ViewHeader'
import { useAppData } from '../contexts/AppDataContext'
import { useAgents } from '../hooks/useAgents'
import { buttonClass, type View } from '../lib/ui'

export function AgentsView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { rooms } = useAppData()
  const agents = useAgents(rooms)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewHeader title="Agents" subtitle={`${agents.length} connected agent(s)`} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {agents.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted">
              No agents connected yet. Set one up and it will appear here.
            </p>
            {onNavigate ? (
              <button type="button" className={buttonClass} onClick={() => onNavigate('connect')}>
                <MdCable className="h-4 w-4" aria-hidden />
                Connect an agent
              </button>
            ) : null}
          </div>
        ) : (
          <table className="w-full max-w-2xl text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 font-medium">Agent</th>
                <th className="font-medium">Kind</th>
                <th className="font-medium">Room</th>
                <th className="font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={`${agent.room}-${agent.name}-${index}`} className="border-t border-border">
                  <td className="py-2 font-medium">{agent.name}</td>
                  <td className="text-muted">{agent.kind}</td>
                  <td>{agent.room}</td>
                  <td className="text-muted">{new Date(agent.joinedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
