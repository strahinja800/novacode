import { tool } from 'ai'
import { z } from 'zod'

export const modeSchema = z.enum(['BUILD', 'PLAN'])

export type ModeType = z.infer<typeof modeSchema>

export const Mode = {
  BUILD: 'BUILD',
  PLAN: 'PLAN',
} as const satisfies Record<string, ModeType>

export const toolInputSchemas = {
  read_file: z.object({
    path: z
      .string()
      .describe('Path to the file, relative to the project root'),
  }),
  list_directory: z.object({
    path: z
      .string()
      .default('.')
      .describe('Directory relative to the project root'),
  }),
  glob: z.object({
    pattern: z.string().describe('Glob pattern to match against file paths'),
    path: z
      .string()
      .default('.')
      .describe('Directory to search in, relative to the project root'),
  }),
  grep: z.object({
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
  write_file: z.object({
    path: z
      .string()
      .describe('Path to the file, relative to the project root'),
    content: z.string().describe('The complete new contents of the file'),
  }),
  edit_file: z.object({
    path: z
      .string()
      .describe('Path to the file, relative to the project root'),
    oldString: z
      .string()
      .describe('Exact text to replace, including indentation'),
    newString: z.string().describe('Text to put in its place'),
  }),
  bash: z.object({
    command: z.string().describe('The shell command to run'),
    timeout: z
      .number()
      .optional()
      .describe('Timeout in milliseconds (default 60000)'),
  }),
} as const

export const readOnlyToolContracts = {
  read_file: tool({
    description:
      'Read a file from the project. Returns the file contents with 1-based line numbers.',
    inputSchema: toolInputSchemas.read_file,
    outputSchema: z.string(),
  }),
  list_directory: tool({
    description:
      'List the entries in a directory. Directories are marked with a trailing slash.',
    inputSchema: toolInputSchemas.list_directory,
    outputSchema: z.string(),
  }),
  glob: tool({
    description:
      'Find files by glob pattern, for example `**/*.ts` or `packages/*/package.json`.',
    inputSchema: toolInputSchemas.glob,
    outputSchema: z.string(),
  }),
  grep: tool({
    description:
      'Search file contents by regular expression. Returns matching lines as `path:line: text`.',
    inputSchema: toolInputSchemas.grep,
    outputSchema: z.string(),
  }),
} as const

export const buildToolContracts = {
  ...readOnlyToolContracts,
  write_file: tool({
    description:
      'Write a file, creating it and any missing parent directories. Overwrites the file if it already exists.',
    inputSchema: toolInputSchemas.write_file,
    outputSchema: z.string(),
  }),
  edit_file: tool({
    description:
      'Replace an exact string in a file. The string must appear exactly once, so include surrounding context to make it unique.',
    inputSchema: toolInputSchemas.edit_file,
    outputSchema: z.string(),
  }),
  bash: tool({
    description:
      'Run a shell command in the project directory. Use for tests, builds, git and other one-off commands.',
    inputSchema: toolInputSchemas.bash,
    outputSchema: z.string(),
  }),
} as const

export type ToolContracts = typeof buildToolContracts

export type ToolName = keyof ToolContracts

export const READ_ONLY_TOOL_NAMES = Object.keys(
  readOnlyToolContracts,
) as (keyof typeof readOnlyToolContracts)[]

export function getToolContracts(mode: ModeType) {
  return mode === Mode.PLAN ? readOnlyToolContracts : buildToolContracts
}
