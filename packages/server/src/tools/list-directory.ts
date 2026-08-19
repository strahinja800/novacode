import { readdir } from 'node:fs/promises'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside, toToolError } from './paths'

const IGNORED = new Set(['node_modules', '.git', 'dist', '.next', 'generated'])

export function createListDirectoryTool(cwd: string) {
  return tool({
    description:
      'List the entries in a directory. Directories are marked with a trailing slash.',
    inputSchema: z.object({
      path: z
        .string()
        .default('.')
        .describe('Directory relative to the project root'),
    }),
    execute: async ({ path }) => {
      try {
        const resolved = await resolveInside(cwd, path)
        const entries = await readdir(resolved, { withFileTypes: true })

        const listed = entries
          .filter(entry => !IGNORED.has(entry.name))
          .map(entry => (entry.isDirectory() ? `${entry.name}/` : entry.name))
          // Directories first, then alphabetical: the shape of the tree reads
          // faster than a flat sorted list.
          .sort((a, b) => {
            const aIsDir = a.endsWith('/')
            const bIsDir = b.endsWith('/')

            if (aIsDir !== bIsDir) return aIsDir ? -1 : 1

            return a.localeCompare(b)
          })

        if (listed.length === 0) return `${path} is empty`

        return listed.join('\n')
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
