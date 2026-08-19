import { tool } from 'ai'
import { z } from 'zod'

import { toToolError } from './paths'

const MAX_OUTPUT = 32 * 1024
const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Run a shell command in the workspace.
 *
 * Unlike the file tools, this has no path guard — a command is free to `cd`
 * anywhere, and pretending otherwise would be theatre. What it does have is a
 * timeout, so a command that waits for input cannot hold the turn open, and an
 * output cap, so a runaway process cannot fill the context window.
 */
export function createBashTool(cwd: string) {
  return tool({
    description:
      'Run a shell command in the project directory. Use for tests, builds, git and other one-off commands.',
    inputSchema: z.object({
      command: z.string().describe('The shell command to run'),
      timeout: z
        .number()
        .optional()
        .describe(`Timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS})`),
    }),
    execute: async ({ command, timeout }) => {
      try {
        const proc = Bun.spawn(['sh', '-c', command], {
          cwd,
          stdout: 'pipe',
          stderr: 'pipe',
        })

        const timer = setTimeout(() => {
          proc.kill()
        }, timeout ?? DEFAULT_TIMEOUT_MS)

        const [stdout, stderr] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
        ])

        const exitCode = await proc.exited
        clearTimeout(timer)

        const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
        const body = combined.slice(0, MAX_OUTPUT)
        const truncated =
          combined.length > MAX_OUTPUT ? '\n(output truncated)' : ''

        if (exitCode !== 0) {
          return `Exited with code ${exitCode}\n${body}${truncated}`
        }

        return body ? body + truncated : 'Command finished with no output'
      } catch (caught) {
        return toToolError(caught)
      }
    },
  })
}
