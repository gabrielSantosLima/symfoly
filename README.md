# Symfoly

A message orchestrator to broadcast messages between agents.

## Requirements

- Node.js 20 or newer
- npm

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Script                 | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start the app in development with hot reload.    |
| `npm run build`        | Bundle the main, preload and renderer processes. |
| `npm run package`      | Build installers/archives with electron-builder. |
| `npm run typecheck`    | Type-check the Node and web projects.            |
| `npm run lint`         | Run ESLint.                                      |
| `npm run format:check` | Check formatting with Prettier.                  |
| `npm test`             | Run the test suite with Vitest.                  |

## Release

Releases are cut through the `Release` GitHub Action:

```bash
gh workflow run release.yml -f bump=minor -f summary="..."
```

The workflow resolves the next version from `package.json`, generates release
notes from Conventional Commits and creates a GitHub release. The first release
is `v0.1.0`.

## License

MIT
