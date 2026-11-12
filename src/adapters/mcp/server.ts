import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { resolveEndpoint } from '../../domain/services/EndpointStore'
import { HubClient } from '../HubClient'
import { SymfolyTools } from './tools'

function resolveConnection(): { url: string; token: string } {
  const endpoint = resolveEndpoint()
  const url = process.env.SYMFOLY_URL ?? (endpoint ? `ws://127.0.0.1:${endpoint.port}` : undefined)
  const token = process.env.SYMFOLY_TOKEN ?? endpoint?.token
  if (!url || !token) {
    throw new Error(
      'No running Symfoly hub found. Open the app (or run "npm run hub") and try again.',
    )
  }
  return { url, token }
}

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

async function main(): Promise<void> {
  const { url, token } = resolveConnection()
  const name = process.env.SYMFOLY_NAME ?? 'mcp'
  const client = await HubClient.connect({ url, token, name })
  const tools = new SymfolyTools(client)

  const server = new McpServer({ name: 'symfoly', version: '0.1.0' })

  server.registerTool(
    'symfoly_join',
    {
      description: 'Enter a Symfoly room to collaborate with other agents.',
      inputSchema: { room: z.string() },
    },
    async ({ room }) => textResult(await tools.join(room)),
  )

  server.registerTool(
    'symfoly_leave',
    { description: 'Leave a Symfoly room.', inputSchema: { room: z.string() } },
    async ({ room }) => textResult(tools.leave(room)),
  )

  server.registerTool(
    'symfoly_send',
    {
      description: 'Send a message to a Symfoly room, optionally addressed to one agent.',
      inputSchema: {
        room: z.string(),
        text: z.string(),
        to: z.string().optional(),
        kind: z.enum(['chat', 'task', 'result']).optional(),
        expectsReply: z.boolean().optional(),
        done: z.boolean().optional(),
      },
    },
    async (args) => textResult(await tools.send(args)),
  )

  server.registerTool(
    'symfoly_receive',
    {
      description: 'Wait for new messages in a room (long-poll) and return them.',
      inputSchema: { room: z.string(), waitSeconds: z.number().optional() },
    },
    async ({ room, waitSeconds }) => textResult(await tools.receive({ room, waitSeconds })),
  )

  server.registerTool(
    'symfoly_rooms',
    { description: 'List the rooms known to the hub.' },
    async () => textResult(await tools.listRooms()),
  )

  server.registerTool(
    'symfoly_state',
    {
      description:
        'Re-sync snapshot for a room: participants, the shared task board and the last message cursor. Call this before acting.',
      inputSchema: { room: z.string() },
    },
    async ({ room }) => textResult(await tools.state(room)),
  )

  server.registerTool(
    'symfoly_task',
    {
      description:
        'Shared task board. discover a task, claim it (takes a lease), renew the lease, release it, complete it with a result, or verify a done task (by another agent).',
      inputSchema: {
        room: z.string(),
        action: z.enum(['discover', 'claim', 'renew', 'release', 'complete', 'verify']),
        id: z.string().optional(),
        title: z.string().optional(),
        deps: z.array(z.string()).optional(),
        ttlSeconds: z.number().optional(),
        result: z.string().optional(),
      },
    },
    async (args) => textResult(await tools.task(args)),
  )

  await server.connect(new StdioServerTransport())
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
