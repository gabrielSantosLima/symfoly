export interface ParsedArgs {
  command: string
  positionals: string[]
  flags: Record<string, string | boolean>
}

/** Tiny argv parser: `--name value` or `--flag`, everything else positional. */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command = '', ...rest] = argv
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index]
    if (token.startsWith('--')) {
      const name = token.slice(2)
      const next = rest[index + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next
        index++
      } else {
        flags[name] = true
      }
    } else {
      positionals.push(token)
    }
  }
  return { command, positionals, flags }
}
