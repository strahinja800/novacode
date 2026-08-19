import { readFile, writeFile } from 'node:fs/promises'

import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside, toToolError } from './paths'

export function createEditFileTool(cwd: string) {
  return tool({
    description:
      'Replace an exact string in a file. The string must appear exactly once, so include surrounding context to make it unique.',
    inputSchema: z.object({
      path: z.string().describe('Path to the file, relative to the project root'),
      oldString: z.string().describe('Exact text to replace, including indentation'),
      newString: z.string().describe('Text to put in its place'),
    }),
    execute: async ({ path, oldString, newString }) => {
      try {
        const resolved = await resolveInside(cwd, path)
        const contents = await readFile(resolved, 'utf8')

        const occurrences = contents.split(oldString).length - 1

        if (occurrences === 0) {
          throw new Error(`No match for that string in ${path}`)
        }

        // Refusing rather than guessing: replacing the wrong one of several
        // identical blocks is a silent corruption the model cannot see.
        if (occurrences > 1) {
          throw new Error(
            `Found ${occurrences} matches in ${path}. Add surrounding context so the string is unique.`,
          )
        }

        await writeFile(resolved, contents.replace(oldString, newString), 'utf8')

        return `Edited ${path}`
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
