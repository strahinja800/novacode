import { relative, resolve, sep } from 'node:path'

/**
 * Resolve a model-supplied path, refusing anything outside the workspace.
 *
 * The obvious `resolved.startsWith(root)` is wrong: for a root of
 * `/home/me/app` it happily accepts `/home/me/app-backup`. Comparing against
 * `root + sep` closes that, with an equality check so the root itself passes.
 *
 * This guards the file tools only. `bash` runs a real shell and can go
 * anywhere; that is what the tool is for.
 */
export function resolveInside(cwd: string, path: string): string {
  const root = resolve(cwd)
  const resolved = resolve(root, path)

  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Path is outside the project directory: ${path}`)
  }

  return resolved
}

/** Paths are reported relative to the workspace, so the model sees what you see. */
export function toWorkspacePath(cwd: string, absolutePath: string): string {
  return relative(resolve(cwd), absolutePath) || '.'
}

/** Tools report failure as text; throwing would abort the whole turn. */
export function toToolError(caught: unknown): string {
  return `Error: ${caught instanceof Error ? caught.message : String(caught)}`
}
