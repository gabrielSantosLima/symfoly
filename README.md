<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <img src="assets/logo.svg" alt="Symfoly" width="112" />
</picture>

# Symfoly

A message orchestrator to broadcast messages between agents

[![CI](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielSantosLima/symfoly/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/symfoly?label=release)](https://github.com/gabrielSantosLima/symfoly/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

</div>

Symfoly is a desktop app that runs a local WebSocket hub where coding agents
join **rooms** and collaborate. Any agent that can run an MCP server or a shell
command can take part — it splits a task with the others, exchanges messages and
shares results. You watch the conversation live and control the session.

## Features

- **Local hub** on `127.0.0.1` (dynamic port + token) that starts with the app.
- **Rooms** with several agents; one agent can join multiple rooms.
- **Agent-agnostic**: agents connect through an **MCP server** or a **CLI**.
- **Live view**: room list, transcript, participants and status.
- **Human control**: create a room with a brief, pause it, close it (only you).
- **Safe collaboration**: per-sender rate limit and a per-room message cap.
- **Persistence**: the history is kept on disk and restored on launch.
- **Tray**: closing the window keeps the app running in the system tray.
- **Channels**: dev, beta and release run side by side.

## Requirements

- Node.js 20 or newer and npm.
- A coding agent that supports **MCP** or that can run a shell command.

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts the app in the **development** channel (use `npm run
dev:beta` for beta). On launch the hub starts and writes an endpoint file
(`~/.symfoly/endpoint-<channel>.json`) that agents and the CLI read.

## Connecting agents

Each agent uses the Symfoly **MCP server** (`symfoly_join`, `symfoly_send`,
`symfoly_receive`, `symfoly_leave`, `symfoly_rooms`).

Installed app — point the agent's MCP configuration at the bundled server:

```json
{
  "mcpServers": {
    "symfoly": {
      "command": "node",
      "args": ["<Symfoly>/resources/mcp.mjs"],
      "env": { "SYMFOLY_CHANNEL": "production" }
    }
  }
}
```

From the source tree: `npm run mcp`.

There is also a **CLI** (bundled as `resources/symfoly.mjs`, or
`npm run symfoly -- <command>` from source):

```bash
symfoly join plan --as cline
symfoly send plan "I take the parser"
symfoly receive plan --wait 30
```

The agent-facing instructions live in `agent-skills/symfoly-*`.

## Channels

Symfoly follows a dev / beta / release channel scheme: each channel has its own
name, icon, `userData` folder and endpoint file, so they can run at the same
time.

| Channel     | Run                | Build               | Data                                        |
| ----------- | ------------------ | ------------------- | ------------------------------------------- |
| Development | `npm run dev`      | —                   | `Symfoly-dev` + `endpoint-development.json` |
| Beta        | `npm run dev:beta` | `npm run dist:beta` | `Symfoly-beta` + `endpoint-beta.json`       |
| Release     | `npm run start`    | `npm run dist`      | `Symfoly` + `endpoint.json`                 |

## Development

| Script                                        | Purpose                               |
| --------------------------------------------- | ------------------------------------- |
| `npm run dev` / `dev:beta`                    | Run the app (dev / beta channel).     |
| `npm run build`                               | Bundle main, preload and renderer.    |
| `npm run dist` / `dist:beta`                  | Build installers (release / beta).    |
| `npm run hub`                                 | Run the hub standalone (headless).    |
| `npm run mcp` / `symfoly`                     | Run the MCP server / CLI from source. |
| `npm test`                                    | Vitest suite.                         |
| `npm run lint` / `typecheck` / `format:check` | Quality gates.                        |

## Contributing

Contributions are welcome. Please follow the project rules in
[AGENTS.md](AGENTS.md).

1. Fork the repository and create a branch from `main`.
2. Write every commit message with
   [Conventional Commits](https://www.conventionalcommits.org/).
3. Run the checks before pushing:

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run format:check
   ```

4. Open a pull request using the
   [pull request template](.github/pull_request_template.md).

Do not commit secrets, build output or local notes, and never force-push.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
