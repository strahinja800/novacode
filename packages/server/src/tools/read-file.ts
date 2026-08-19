import { readFile, stat } from 'node:fs/promises'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside, toToolError } from './paths'

const MAX_FILE_SIZE = 256 * 1024

export function createReadFileTool(cwd: string) {
  return tool({
    description:
      'Read a file from the project. Returns the file contents with 1-based line numbers.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file, relative to the project root'),
    }),
    execute: async ({ path }) => {
      try {
        const resolved = await resolveInside(cwd, path)
        const stats = await stat(resolved)

        if (!stats.isFile()) {
          throw new Error(`Not a file: ${path}`)
        }

        if (stats.size > MAX_FILE_SIZE) {
          throw new Error(
            `File is ${stats.size} bytes, over the ${MAX_FILE_SIZE} byte limit. Use grep to find the part you need.`,
          )
        }

        const contents = await readFile(resolved, 'utf8')

        // Numbered so the model can point at a line, and so `edit_file` has
        // something unambiguous to anchor on.
        return contents
          .split('\n')
          .map((line, index) => `${index + 1}\t${line}`)
          .join('\n')
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
