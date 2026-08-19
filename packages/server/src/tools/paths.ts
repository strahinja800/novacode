import { realpath } from 'node:fs/promises'
import { basename, dirname, relative, resolve, sep } from 'node:path'

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

export async function resolveInside(
  cwd: string,
  path: string,
): Promise<string> {
  const root = await nearestRealPath(resolve(cwd))
  const resolved = await nearestRealPath(resolve(root, path))

  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Path is outside the project directory: ${path}`)
  }

  return resolved
}

export function toWorkspacePath(cwd: string, absolutePath: string): string {
  return relative(resolve(cwd), absolutePath) || '.'
}

export function toToolError(caught: unknown): string {
  return `Error: ${caught instanceof Error ? caught.message : String(caught)}`
}
