import { tool } from 'ai'
import { z } from 'zod'

import { resolveInside, toToolError, toWorkspacePath } from './paths'

const MAX_MATCHES = 100

export function createGrepTool(cwd: string) {
  return tool({
    description:
      'Search file contents by regular expression. Returns matching lines as `path:line: text`.',
    inputSchema: z.object({
      pattern: z.string().describe('Regular expression to search for'),
      path: z
        .string()
        .default('.')
        .describe('Directory to search in, relative to the project root'),
      include: z
        .string()
        .optional()
        .describe('Only search files matching this glob, for example `*.ts`'),
    }),
    execute: async ({ pattern, path, include }) => {
      try {
        const root = await resolveInside(cwd, path)

        const args = [
          'grep',
          '-rnI',
          '--exclude-dir=node_modules',
          '--exclude-dir=.git',
          '--exclude-dir=dist',
        ]

        if (include) args.push(`--include=${include}`)

        // `-e` so a pattern starting with `-` is not read as a flag.
        args.push('-e', pattern, '.')

        const proc = Bun.spawn(args, {
          cwd: root,
          stdout: 'pipe',
          stderr: 'pipe',
        })

        const output = await new Response(proc.stdout).text()
        const exitCode = await proc.exited

        // grep exits 1 for "no matches", which is an answer rather than a fault.
        if (exitCode === 1) return `No matches for ${pattern}`

        if (exitCode > 1) {
          const stderr = await new Response(proc.stderr).text()
          throw new Error(stderr.trim() || `grep exited with ${exitCode}`)
        }

        const lines = output.split('\n').filter(Boolean).slice(0, MAX_MATCHES)

        const matches = lines.map(line => {
          const [file, lineNumber, ...rest] = line.split(':')

          if (!file || !lineNumber) return line

          return `${toWorkspacePath(cwd, `${root}/${file}`)}:${lineNumber}: ${rest.join(':').trim()}`
        })

        const truncated =
          lines.length >= MAX_MATCHES
            ? `\n(stopped at ${MAX_MATCHES} matches)`
            : ''

        return matches.join('\n') + truncated
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
