import type { MessageKind } from '../../shared/protocol'
import { resolveEndpoint } from '../../domain/services/EndpointStore'
import { HubClient, type TaskRequest } from '../HubClient'
import { parseArgs, type ParsedArgs } from './args'

function stringFlag(flags: ParsedArgs['flags'], name: string): string | undefined {
  const value = flags[name]
  return typeof value === 'string' ? value : undefined
}

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`missing ${label}`)
  return value
}

function resolveConnection(flags: ParsedArgs['flags']): { url: string; token: string } {
  const endpoint = resolveEndpoint()
  const url =
    stringFlag(flags, 'url') ??
    process.env.SYMFOLY_URL ??
    (endpoint ? `ws://127.0.0.1:${endpoint.port}` : undefined)
  const token = stringFlag(flags, 'token') ?? process.env.SYMFOLY_TOKEN ?? endpoint?.token
  if (!url || !token) {
    throw new Error('No hub endpoint. Start the hub (npm run hub) or pass --url and --token.')
  }
  return { url, token }
}

function printUsage(): void {
  console.log(`symfoly <command> [options]

Commands:
  join <room> --as <name>          Enter a room
  leave <room>                     Leave a room
  delete <room>                    Delete a room and its history
  send <room> <text> [--to <name>] [--kind chat|task|result] [--expects-reply] [--done]
                                   Send a message to a room
  receive <room> [--since <seq>] [--wait <seconds>]   Wait for new messages
  receive --all [--since <seq>] [--wait <seconds>]    Wait across joined rooms
  state <room>                     Re-sync snapshot (participants, tasks, cursor)
  task <room> <action> [--id <id>] [--title <t>] [--deps a,b] [--ttl <s>] [--result <r>]
                                   Shared task board (discover|claim|renew|release|complete|verify)
  rooms                            List rooms

Connection:
  --url <ws://...>   --token <token>   (or SYMFOLY_URL / SYMFOLY_TOKEN / ~/.symfoly/endpoint.json)
  --as <name>        identity of this client (or SYMFOLY_NAME)`)
}

async function main(): Promise<void> {
  const { command, positionals, flags } = parseArgs(process.argv.slice(2))
  if (!command || command === 'help' || flags.help) {
    printUsage()
    return
  }

  const { url, token } = resolveConnection(flags)
  const name = stringFlag(flags, 'as') ?? process.env.SYMFOLY_NAME ?? 'cli'
  const client = await HubClient.connect({ url, token, name })

  try {
    switch (command) {
      case 'join':
        console.log(JSON.stringify(await client.join(required(positionals[0], 'room')), null, 2))
        break

      case 'leave':
        client.leave(required(positionals[0], 'room'))
        console.log(JSON.stringify({ ok: true }))
        break

      case 'delete':
        client.delete(required(positionals[0], 'room'))
        console.log(JSON.stringify({ ok: true }))
        break

      case 'send': {
        const room = required(positionals[0], 'room')
        await client.join(room)
        client.send({
          room,
          text: required(positionals.slice(1).join(' '), 'text'),
          to: stringFlag(flags, 'to'),
          kind: stringFlag(flags, 'kind') as MessageKind | undefined,
          expectsReply: flags['expects-reply'] === true,
          done: flags.done === true,
        })
        console.log(JSON.stringify({ ok: true }))
        break
      }

      case 'receive': {
        const all = flags.all === true
        const room = all ? undefined : required(positionals[0], 'room')
        if (room) await client.join(room)
        const messages = await client.receive({
          room,
          all,
          since: Number(stringFlag(flags, 'since') ?? 0),
          wait: Number(stringFlag(flags, 'wait') ?? 30),
        })
        console.log(JSON.stringify(messages, null, 2))
        break
      }

      case 'state': {
        const room = required(positionals[0], 'room')
        await client.join(room)
        console.log(JSON.stringify(await client.state(room), null, 2))
        break
      }

      case 'task': {
        const room = required(positionals[0], 'room')
        const action = required(positionals[1], 'action') as TaskRequest['action']
        const depsFlag = stringFlag(flags, 'deps')
        const ttlFlag = stringFlag(flags, 'ttl')
        await client.join(room)
        const tasks = await client.task({
          room,
          action,
          id: stringFlag(flags, 'id'),
          title: stringFlag(flags, 'title'),
          deps: depsFlag
            ? depsFlag
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean)
            : undefined,
          ttlSeconds: ttlFlag ? Number(ttlFlag) : undefined,
          result: stringFlag(flags, 'result'),
        })
        console.log(JSON.stringify(tasks, null, 2))
        break
      }

      case 'rooms':
        console.log(JSON.stringify(await client.rooms(), null, 2))
        break

      default:
        printUsage()
        process.exitCode = 1
    }
  } finally {
    await client.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
