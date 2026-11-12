#!/usr/bin/env node
// Bundles the MCP bridge and the CLI into standalone ESM files shipped as
// extraResources, so agents can run them from an installed app (no node_modules
// required next to them).
import { build } from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const TARGETS = [
  { entry: 'src/adapters/mcp/server.ts', out: 'resources/mcp.mjs' },
  { entry: 'src/adapters/cli/index.ts', out: 'resources/symfoly.mjs' }
]

for (const target of TARGETS) {
  await build({
    entryPoints: [join(ROOT, target.entry)],
    outfile: join(ROOT, target.out),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // ws optionally requires these native accelerators; leave them unresolved.
    external: ['bufferutil', 'utf-8-validate'],
    banner: {
      js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);"
    },
    logLevel: 'info'
  })
}

console.log('Bundled resources/mcp.mjs and resources/symfoly.mjs.')
