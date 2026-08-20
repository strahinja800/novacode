import { mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve, sep } from 'node:path'
import process from 'node:process'

import {
  Mode,
  type ModeType,
  READ_ONLY_TOOL_NAMES,
  type ToolName,
} from '@novacode/shared'

const MAX_FILE_SIZE = 256 * 1024
const MAX_GLOB_RESULTS = 200
const MAX_GREP_MATCHES = 100
const MAX_BASH_OUTPUT = 32 * 1024
const DEFAULT_BASH_TIMEOUT_MS = 60_000

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'generated',
])

async function nearestRealPath(target: string): Promise<string> {
  const missing: string[] = []
  let candidate = target

  for (;;) {
    try {
      return resolve(await realpath(candidate), ...missing)
    } catch {
      const parent = dirname(candidate)

      if (parent === candidate) return resolve(candidate, ...missing)

      missing.unshift(basename(candidate))
      candidate = parent
    }
  }
}

async function resolveInside(path: string): Promise<string> {
  const root = await nearestRealPath(resolve(process.cwd()))
  const resolved = await nearestRealPath(resolve(root, path))

  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Path is outside the project directory: ${path}`)
  }

  return resolved
}

function toWorkspacePath(absolutePath: string): string {
  return relative(resolve(process.cwd()), absolutePath) || '.'
}

async function readFileTool(input: { path: string }): Promise<string> {
  const resolved = await resolveInside(input.path)
  const stats = await stat(resolved)

  if (!stats.isFile()) throw new Error(`Not a file: ${input.path}`)

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is ${stats.size} bytes, over the ${MAX_FILE_SIZE} byte limit. Use grep to find the part you need.`,
    )
  }

  const contents = await readFile(resolved, 'utf8')

  return contents
    .split('\n')
    .map((line, index) => `${index + 1}\t${line}`)
    .join('\n')
}

async function listDirectoryTool(input: { path: string }): Promise<string> {
  const resolved = await resolveInside(input.path)
  const entries = await readdir(resolved, { withFileTypes: true })

  const listed = entries
    .filter(entry => !IGNORED_DIRECTORIES.has(entry.name))
    .map(entry => (entry.isDirectory() ? `${entry.name}/` : entry.name))
    .sort((a, b) => {
      const aIsDir = a.endsWith('/')
      const bIsDir = b.endsWith('/')

      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1

      return a.localeCompare(b)
    })

  if (listed.length === 0) return `${input.path} is empty`

  return listed.join('\n')
}

async function globTool(input: {
  pattern: string
  path: string
}): Promise<string> {
  const root = await resolveInside(input.path)
  const glob = new Bun.Glob(input.pattern)

  const files: string[] = []

  for await (const match of glob.scan({ cwd: root, absolute: true })) {
    if (match.includes(`${sep}node_modules${sep}`)) continue
    if (match.includes(`${sep}.git${sep}`)) continue

    files.push(toWorkspacePath(match))

    if (files.length >= MAX_GLOB_RESULTS) break
  }

  if (files.length === 0) return `No files match ${input.pattern}`

  const truncated =
    files.length >= MAX_GLOB_RESULTS
      ? `\n(stopped at ${MAX_GLOB_RESULTS} results)`
      : ''

  return files.join('\n') + truncated
}

async function grepTool(input: {
  pattern: string
  path: string
  include?: string
}): Promise<string> {
  const root = await resolveInside(input.path)

  const args = [
    'grep',
    '-rnI',
    '--exclude-dir=node_modules',
    '--exclude-dir=.git',
    '--exclude-dir=dist',
  ]

  if (input.include) args.push(`--include=${input.include}`)

  args.push('-e', input.pattern, '.')

  const proc = Bun.spawn(args, { cwd: root, stdout: 'pipe', stderr: 'pipe' })

  const output = await new Response(proc.stdout).text()
  const exitCode = await proc.exited

  if (exitCode === 1) return `No matches for ${input.pattern}`

  if (exitCode > 1) {
    const stderr = await new Response(proc.stderr).text()

    throw new Error(stderr.trim() || `grep exited with ${exitCode}`)
  }

  const lines = output.split('\n').filter(Boolean).slice(0, MAX_GREP_MATCHES)

  const matches = lines.map(line => {
    const [file, lineNumber, ...rest] = line.split(':')

    if (!file || !lineNumber) return line

    return `${toWorkspacePath(resolve(root, file))}:${lineNumber}: ${rest.join(':').trim()}`
  })

  const truncated =
    lines.length >= MAX_GREP_MATCHES
      ? `\n(stopped at ${MAX_GREP_MATCHES} matches)`
      : ''

  return matches.join('\n') + truncated
}

async function writeFileTool(input: {
  path: string
  content: string
}): Promise<string> {
  const resolved = await resolveInside(input.path)

  await mkdir(dirname(resolved), { recursive: true })
  await writeFile(resolved, input.content, 'utf8')

  return `Wrote ${input.content.split('\n').length} lines to ${input.path}`
}

async function editFileTool(input: {
  path: string
  oldString: string
  newString: string
}): Promise<string> {
  const resolved = await resolveInside(input.path)
  const contents = await readFile(resolved, 'utf8')

  const occurrences = contents.split(input.oldString).length - 1

  if (occurrences === 0) {
    throw new Error(`No match for that string in ${input.path}`)
  }

  if (occurrences > 1) {
    throw new Error(
      `Found ${occurrences} matches in ${input.path}. Add surrounding context so the string is unique.`,
    )
  }

  await writeFile(
    resolved,
    contents.replace(input.oldString, input.newString),
    'utf8',
  )

  return `Edited ${input.path}`
}

async function bashTool(input: {
  command: string
  timeout?: number
}): Promise<string> {
  const proc = Bun.spawn(['sh', '-c', input.command], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timer = setTimeout(() => {
    proc.kill()
  }, input.timeout ?? DEFAULT_BASH_TIMEOUT_MS)

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])

  const exitCode = await proc.exited
  clearTimeout(timer)

  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
  const body = combined.slice(0, MAX_BASH_OUTPUT)
  const truncated = combined.length > MAX_BASH_OUTPUT ? '\n(output truncated)' : ''

  if (exitCode !== 0) {
    return `Exited with code ${exitCode}\n${body}${truncated}`
  }

  return body ? body + truncated : 'Command finished with no output'
}

type ExecuteLocalToolParams = {
  toolName: string
  input: unknown
  mode: ModeType
}

export async function executeLocalTool({
  toolName,
  input,
  mode,
}: ExecuteLocalToolParams): Promise<string> {
  if (
    mode === Mode.PLAN &&
    !READ_ONLY_TOOL_NAMES.includes(
      toolName as (typeof READ_ONLY_TOOL_NAMES)[number],
    )
  ) {
    return `Error: ${toolName} is not available in plan mode.`
  }

  try {
    switch (toolName as ToolName) {
      case 'read_file':
        return await readFileTool(input as { path: string })
      case 'list_directory':
        return await listDirectoryTool(input as { path: string })
      case 'glob':
        return await globTool(input as { pattern: string; path: string })
      case 'grep':
        return await grepTool(
          input as { pattern: string; path: string; include?: string },
        )
      case 'write_file':
        return await writeFileTool(input as { path: string; content: string })
      case 'edit_file':
        return await editFileTool(
          input as { path: string; oldString: string; newString: string },
        )
      case 'bash':
        return await bashTool(input as { command: string; timeout?: number })
      default:
        return `Error: unknown tool ${toolName}`
    }
  } catch (caught) {
    return `Error: ${caught instanceof Error ? caught.message : String(caught)}`
  }
}
