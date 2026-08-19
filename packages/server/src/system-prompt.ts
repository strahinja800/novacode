import { Mode } from '@novacode/database/enums'

type SystemPromptParams = {
  cwd?: string | null
  mode: Mode
}

const PLAN_TOOLS = 'read_file, list_directory, glob, grep'
const BUILD_TOOLS = `${PLAN_TOOLS}, write_file, edit_file, bash`

const SHARED_RULES = [
  'Be decisive. Prefer acting over asking when the intent is clear.',
  'Use glob and grep to find what is relevant instead of reading the tree file by file.',
  'Never re-read a file you have already read in this conversation.',
  'Batch your tool calls. Read five files in one turn rather than one at a time.',
].join('\n')

/**
 * The instructions for one turn.
 *
 * Built per request rather than kept as a constant, because it depends on which
 * directory the session was started in and which mode the visitor is in — and
 * the tool list has to agree with what `createTools` actually handed over.
 */
export function buildSystemPrompt({ cwd, mode }: SystemPromptParams): string {
  const parts: string[] = [
    'You are NovaCode, a coding assistant that works inside the user\'s terminal.',
    'You have direct access to their project through tools. Use them rather than guessing at what the code contains.',
  ]

  if (cwd) {
    parts.push(`The project is at ${cwd}. All paths you pass to tools are relative to it.`)
  }

  if (mode === Mode.PLAN) {
    parts.push(
      [
        'You are in PLAN mode.',
        'Analyze, research and propose. Do not make changes — you have no tools that can.',
        'Explore the codebase, then present a clear plan of action, explain the trade-offs, and ask when something is genuinely ambiguous.',
      ].join('\n'),
      `Available tools: ${PLAN_TOOLS}.`,
    )
  } else {
    parts.push(
      [
        'You are in BUILD mode.',
        'Implement changes directly. Read and understand the relevant code before you change it.',
        'Use write_file for new files, edit_file for targeted changes, and bash for commands, tests, builds and git.',
        'After making changes, verify them when there is a way to.',
      ].join('\n'),
      `Available tools: ${BUILD_TOOLS}.`,
    )
  }

  parts.push(SHARED_RULES)

  return parts.join('\n\n')
}
