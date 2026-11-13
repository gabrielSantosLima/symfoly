import { useState, type ReactNode } from 'react'
import { MdAdd, MdAutoFixHigh, MdExtension, MdMonitorHeart } from 'react-icons/md'
import type { DiagnosticsReport, SetupResult } from '../../../shared/ipc'
import { CopyButton } from '../components/CopyButton'
import { StatusDot } from '../components/Badge'
import { ViewHeader } from '../components/ViewHeader'
import { useAppData } from '../contexts/AppDataContext'
import { buttonClass, cardClass, type View } from '../lib/ui'

const STATUS_STYLES: Record<SetupResult['status'], string> = {
  created: 'text-success',
  updated: 'text-success',
  unchanged: 'text-muted',
  skipped: 'text-warning',
}

function Results({ results }: { results: SetupResult[] | null }) {
  if (!results) return null
  return (
    <ul className="mt-3 flex flex-col gap-1 text-xs">
      {results.map((result) => (
        <li key={result.id} className="flex flex-col gap-0.5">
          <span className="font-medium">
            {result.label}: <span className={STATUS_STYLES[result.status]}>{result.status}</span>
            {result.message ? ` (${result.message})` : ''}
          </span>
          <span className="truncate text-muted">{result.path}</span>
        </li>
      ))}
    </ul>
  )
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex items-start gap-3">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-brand text-[12px] font-bold text-brand-fg">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

function CodeBlock({ title, hint, code }: { title: string; hint: string; code: string }) {
  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
        <CopyButton value={code} />
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-all rounded-md bg-surface-2 p-3 text-xs text-fg">
        {code}
      </pre>
    </section>
  )
}

export function ConnectView({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { status, rooms, selected } = useAppData()
  const [agentResults, setAgentResults] = useState<SetupResult[] | null>(null)
  const [skillResults, setSkillResults] = useState<SetupResult[] | null>(null)
  const [diag, setDiag] = useState<DiagnosticsReport | null>(null)
  const [busy, setBusy] = useState<'agents' | 'skills' | 'diag' | ''>('')
  const connect = status?.connect

  if (!connect) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">Connecting…</div>
    )
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

  const promptRoom = selected ?? rooms[rooms.length - 1]?.name ?? '<room>'
  const prompt = [
    `Join the Symfoly room "${promptRoom}" as <your-agent-name>.`,
    'Read the symfoly-* skills (join, receive, send, plan, protocol).',
    'Coordinate through the shared task board (symfoly_task): claim before working,',
    "complete with a result, and verify another agent's done task.",
    'Take the floor (symfoly_floor acquire) before acting and release it when done,',
    'and use expectsReply with a deadline when you ask something (symfoly_send).',
  ].join('\n')

  async function runAgents(): Promise<void> {
    setBusy('agents')
    try {
      setAgentResults(await window.symfoly.setupAgents())
    } finally {
      setBusy('')
    }
  }
  async function runSkills(): Promise<void> {
    setBusy('skills')
    try {
      setSkillResults(await window.symfoly.setupSkills())
    } finally {
      setBusy('')
    }
  }
  async function runDiagnostics(): Promise<void> {
    setBusy('diag')
    try {
      setDiag(await window.symfoly.diagnostics())
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewHeader
        title="Connect an agent"
        subtitle="Three steps: set up the agents, install the skills, then create a room and invite them."
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-6">
        <Step
          n={1}
          title="Set up installed agents"
          hint="Writes the Symfoly MCP server into the config of every installed agent. Restart the agent afterwards so it picks it up."
        >
          <button
            type="button"
            className={buttonClass}
            disabled={busy !== ''}
            onClick={() => void runAgents()}
          >
            <MdAutoFixHigh className="h-4 w-4" aria-hidden />
            {busy === 'agents' ? 'Setting up…' : 'Set up installed agents'}
          </button>
          <Results results={agentResults} />
        </Step>

        <Step
          n={2}
          title="Install the skills"
          hint="Copies the symfoly-* skills into each installed agent, so it knows the workflow."
        >
          <button
            type="button"
            className={buttonClass}
            disabled={busy !== ''}
            onClick={() => void runSkills()}
          >
            <MdExtension className="h-4 w-4" aria-hidden />
            {busy === 'skills' ? 'Installing…' : 'Install skills'}
          </button>
          <Results results={skillResults} />
        </Step>

        <Step
          n={3}
          title="Invite agents to a room"
          hint="Hand this prompt to your agent. Rooms are created under Operate, with a brief."
        >
          {selected ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-2 p-3">
              <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs text-fg">
                {prompt}
              </pre>
              <CopyButton value={prompt} label="Copy prompt" />
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-xs text-muted">
                Create a room first, then come back here to copy the invite.
              </p>
              {onNavigate ? (
                <button type="button" className={buttonClass} onClick={() => onNavigate('rooms')}>
                  <MdAdd className="h-4 w-4" aria-hidden />
                  Create a room
                </button>
              ) : null}
            </div>
          )}
        </Step>

        <section className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Diagnostics</h3>
              <p className="mt-0.5 text-xs text-muted">
                Check that the hub, the agent configs and the skills are in place.
              </p>
            </div>
            <button
              type="button"
              className={buttonClass}
              disabled={busy !== ''}
              onClick={() => void runDiagnostics()}
            >
              <MdMonitorHeart className="h-4 w-4" aria-hidden />
              {busy === 'diag' ? 'Checking…' : 'Run diagnostics'}
            </button>
          </div>
          {diag ? (
            <div className="mt-3 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <StatusDot tone={diag.endpointPresent ? 'success' : 'danger'} />
                Hub endpoint {diag.endpointPresent ? 'present' : 'missing'} ·{' '}
                <span className="font-mono">{diag.hubUrl}</span>
              </div>
              {diag.agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <StatusDot tone={agent.configured ? 'success' : 'neutral'} />
                  {agent.label}:{' '}
                  {agent.configured
                    ? 'configured'
                    : agent.detected
                      ? 'not configured'
                      : 'not installed'}
                </div>
              ))}
              {diag.skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-2">
                  <StatusDot tone={skill.installed ? 'success' : 'neutral'} />
                  {skill.label} skills:{' '}
                  {skill.installed ? 'installed' : skill.detected ? 'missing' : 'not installed'}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <CodeBlock
          title="Generic MCP"
          hint="Paste into any MCP client. The launcher runs the MCP with the app's own runtime — no Node install needed."
          code={recommended}
        />
        <CodeBlock
          title="Manual (Node)"
          hint="Direct command; requires Node on PATH. The path lives in ~/.symfoly/bin and is stable."
          code={manual}
        />
        <CodeBlock
          title="Agent skills"
          hint="Folder with the skills; the step above copies them for you."
          code={connect.skillsPath}
        />
      </div>
    </div>
  )
}
