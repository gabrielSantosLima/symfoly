import { useState } from 'react'
import { MdAutoFixHigh } from 'react-icons/md'
import type { SetupResult } from '../../../shared/ipc'
import { ViewHeader } from '../components/ViewHeader'
import { useAppData } from '../contexts/AppDataContext'
import { buttonClass, cardClass } from '../lib/ui'

const STATUS_STYLES: Record<SetupResult['status'], string> = {
  created: 'text-success',
  updated: 'text-success',
  unchanged: 'text-muted',
  skipped: 'text-warning',
}

function Block({ title, hint, code }: { title: string; hint?: string; code: string }) {
  return (
    <section className={`${cardClass} p-5`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <pre className="mt-3 whitespace-pre-wrap break-all rounded-md bg-surface-2 p-3 text-xs text-fg">
        {code}
      </pre>
    </section>
  )
}

export function ConnectView() {
  const { status } = useAppData()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<SetupResult[] | null>(null)
  const connect = status?.connect

  if (!connect) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">Connecting…</div>
    )
  }

  async function runSetup(): Promise<void> {
    setRunning(true)
    try {
      setResults(await window.symfoly.setupAgents())
    } finally {
      setRunning(false)
    }
  }

  const recommended = JSON.stringify(
    { mcpServers: { symfoly: { command: connect.launcher } } },
    null,
    2,
  )
  const manual = JSON.stringify(
    { mcpServers: { symfoly: { command: 'node', args: [connect.mcpPath] } } },
    null,
    2,
  )
  const cli = `node "${connect.cliPath}" join <room> --as <name>`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewHeader
        title="Connect an agent"
        subtitle="Set up your coding agents so they can join the rooms."
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-6">
        <section className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Set up for me</h3>
              <p className="mt-0.5 text-xs text-muted">
                Writes the Symfoly MCP server into the config of every installed agent (OpenCode,
                Claude Desktop, Claude Code, Cline). It only touches the <code>symfoly</code> entry.
              </p>
            </div>
            <button
              type="button"
              className={buttonClass}
              disabled={running}
              onClick={() => void runSetup()}
            >
              <MdAutoFixHigh className="h-4 w-4" aria-hidden />
              {running ? 'Setting up…' : 'Set up installed agents'}
            </button>
          </div>

          {results ? (
            <ul className="mt-4 flex flex-col gap-2 text-xs">
              {results.map((result) => (
                <li key={result.id} className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {result.label}:{' '}
                    <span className={STATUS_STYLES[result.status]}>{result.status}</span>
                    {result.message ? ` (${result.message})` : ''}
                  </span>
                  <span className="break-all text-muted">{result.path}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <Block
          title="Generic MCP"
          hint="Paste into any MCP client. The launcher runs the MCP with the app's own runtime — no Node install needed."
          code={recommended}
        />
        <Block
          title="Manual (Node)"
          hint="Direct command; requires Node on PATH. The path lives in ~/.symfoly/bin and is stable."
          code={manual}
        />
        <Block title="CLI" hint="For agents that only run shell commands." code={cli} />
        <Block
          title="Agent skills"
          hint="Tell the agent to read the folders here for etiquette and the workflow."
          code={connect.skillsPath}
        />
      </div>
    </div>
  )
}
