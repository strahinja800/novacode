import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const AUTH_PATH = join(homedir(), '.novacode', 'auth.json')

const DIRECTORY_MODE = 0o700
const FILE_MODE = 0o600

type AuthData = {
  token: string
}

export function getAuth(): AuthData | null {
  try {
    const parsed = JSON.parse(readFileSync(AUTH_PATH, 'utf8')) as AuthData

    return typeof parsed?.token === 'string' && parsed.token.length > 0
      ? parsed
      : null
  } catch {
    return null
  }
}

export function saveAuth(token: string): void {
  mkdirSync(dirname(AUTH_PATH), { recursive: true, mode: DIRECTORY_MODE })

  writeFileSync(AUTH_PATH, JSON.stringify({ token }, null, 2), {
    encoding: 'utf8',
    mode: FILE_MODE,
  })
}

export function clearAuth(): void {
  try {
    unlinkSync(AUTH_PATH)
  } catch {
    return
  }
}
