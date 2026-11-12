import { ViewHeader } from '../components/ViewHeader'
import { useAppData } from '../contexts/AppDataContext'
import { useAgents } from '../hooks/useAgents'

export function AgentsView() {
  const { rooms } = useAppData()
  const agents = useAgents(rooms)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewHeader title="Agents" subtitle={`${agents.length} connected agent(s)`} />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {agents.length === 0 ? (
          <p className="text-sm text-muted">
            No agents connected. They join a room through the MCP server or the CLI.
          </p>
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
