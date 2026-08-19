import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside, toToolError, toWorkspacePath } from './paths'

const MAX_RESULTS = 200

export function createGlobTool(cwd: string) {
  return tool({
    description:
      'Find files by glob pattern, for example `**/*.ts` or `packages/*/package.json`.',
    inputSchema: z.object({
      pattern: z.string().describe('Glob pattern to match against file paths'),
      path: z
        .string()
        .default('.')
        .describe('Directory to search in, relative to the project root'),
    }),
    execute: async ({ pattern, path }) => {
      try {
        const root = await resolveInside(cwd, path)
        const glob = new Bun.Glob(pattern)

        const files: string[] = []

        for await (const match of glob.scan({ cwd: root, absolute: true })) {
          if (match.includes(`/node_modules/`) || match.includes(`/.git/`)) {
            continue
          }

          files.push(toWorkspacePath(cwd, match))

          if (files.length >= MAX_RESULTS) break
        }

        if (files.length === 0) return `No files match ${pattern}`

        const truncated =
          files.length >= MAX_RESULTS
            ? `\n(stopped at ${MAX_RESULTS} results)`
            : ''

        return files.join('\n') + truncated
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
