#!/usr/bin/env node
// Starts electron-vite dev with a Symfoly channel (development | beta).
// The channel selects the app name, userData folder and icons in src/main.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const channel = process.argv[2] === 'beta' ? 'beta' : 'development'
const rest = process.argv.slice(3)
const env = { ...process.env, SYMFOLY_CHANNEL: channel }

const require = createRequire(import.meta.url)
const cli = join(dirname(require.resolve('electron-vite/package.json')), 'bin', 'electron-vite.js')

const child = spawn(process.execPath, [cli, 'dev', ...rest], { stdio: 'inherit', env })

child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
