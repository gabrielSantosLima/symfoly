import { useEffect, useState } from 'react'
import type { ParticipantKind, RoomInfo } from '../../../shared/protocol'

export interface AgentEntry {
  room: string
  name: string
  kind: ParticipantKind
  joinedAt: number
}

/** Flattens the participants of every room into one list. */
export function useAgents(rooms: RoomInfo[]): AgentEntry[] {
  const [agents, setAgents] = useState<AgentEntry[]>([])

  useEffect(() => {
    const client = window.symfoly
    if (!client) return
    let cancelled = false
    const load = async (): Promise<void> => {
      const entries: AgentEntry[] = []
      for (const room of rooms) {
        const detail = await client.getRoomDetail(room.id)
        for (const participant of detail?.participants ?? []) {
          entries.push({
            room: room.name,
            name: participant.name,
            kind: participant.kind,
            joinedAt: participant.joinedAt,
          })
        }
      }
      if (!cancelled) setAgents(entries)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [rooms])

  return agents
}
