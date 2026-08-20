import { readdir } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import process from 'node:process'

import type { MentionCandidate } from './types'

export const MAX_FALLBACK_CANDIDATES = 32
export const MIN_FALLBACK_PREFIX_LENGTH = 2

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'generated',
])

function isWithin(root: string, target: string): boolean {
  const relativePath = relative(root, target)

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  )
}

function byKindThenPath(a: MentionCandidate, b: MentionCandidate): number {
  if (a.kind !== b.kind) return a.kind === 'file' ? -1 : 1

  return a.path.localeCompare(b.path)
}

function toCandidate(
  directoryPart: string,
  name: string,
  isDirectory: boolean,
): MentionCandidate {
  const path = directoryPart ? `${directoryPart}${name}` : name

  return {
    path: isDirectory ? `${path}/` : path,
    label: isDirectory ? `${name}/` : name,
    kind: isDirectory ? 'directory' : 'file',
  }
}

async function collectFallback(
  root: string,
  lowercasePrefix: string,
): Promise<MentionCandidate[]> {
  const matches: MentionCandidate[] = []

  const visit = async (absoluteDirectory: string, directoryPart: string) => {
    if (matches.length >= MAX_FALLBACK_CANDIDATES) return

    let entries
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (matches.length >= MAX_FALLBACK_CANDIDATES) return

      const isDirectory = entry.isDirectory()

      if (isDirectory && IGNORED_DIRECTORIES.has(entry.name)) continue
      if (entry.name.startsWith('.') && !lowercasePrefix.startsWith('.')) {
        continue
      }

      if (entry.name.toLowerCase().includes(lowercasePrefix)) {
        matches.push(toCandidate(directoryPart, entry.name, isDirectory))
      }

      if (isDirectory) {
        await visit(
          resolve(absoluteDirectory, entry.name),
          `${directoryPart}${entry.name}/`,
        )
      }
    }
  }

  await visit(root, '')

  return matches.sort(byKindThenPath)
}

export async function getMentionCandidates(
  query: string,
  options: { allowFallback?: boolean } = {},
): Promise<MentionCandidate[]> {
  const { allowFallback = true } = options

  const root = resolve(process.cwd())

  if (query.startsWith('/') || isAbsolute(query)) return []

  const lastSlashIndex = query.lastIndexOf('/')
  const directoryPart =
    lastSlashIndex === -1 ? '' : query.slice(0, lastSlashIndex + 1)
  const namePrefix =
    lastSlashIndex === -1 ? query : query.slice(lastSlashIndex + 1)

  const absoluteDirectory = resolve(root, directoryPart)

  if (!isWithin(root, absoluteDirectory)) return []

  const lowercasePrefix = namePrefix.toLowerCase()
  const showHidden = namePrefix.startsWith('.')

  try {
    const entries = await readdir(absoluteDirectory, { withFileTypes: true })

    const directMatches = entries
      .filter(entry => showHidden || !entry.name.startsWith('.'))
      .filter(entry => entry.name.toLowerCase().startsWith(lowercasePrefix))
      .map(entry => toCandidate(directoryPart, entry.name, entry.isDirectory()))
      .sort(byKindThenPath)

    if (directMatches.length > 0) return directMatches
  } catch {
    return []
  }

  if (!allowFallback) return []
  if (namePrefix.length < MIN_FALLBACK_PREFIX_LENGTH) return []
  if (directoryPart !== '') return []

  return collectFallback(root, lowercasePrefix)
}
