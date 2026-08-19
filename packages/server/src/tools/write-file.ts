import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside, toToolError } from './paths'

export function createWriteFileTool(cwd: string) {
  return tool({
    description:
      'Write a file, creating it and any missing parent directories. Overwrites the file if it already exists.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file, relative to the project root'),
      content: z.string().describe('The complete new contents of the file'),
    }),
    execute: async ({ path, content }) => {
      try {
        const resolved = resolveInside(cwd, path)

        await mkdir(dirname(resolved), { recursive: true })
        await writeFile(resolved, content, 'utf8')

        return `Wrote ${content.split('\n').length} lines to ${path}`
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
