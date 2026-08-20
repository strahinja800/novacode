import type { MentionMatch } from './types'

export const MENTION_TRIGGER = '@'

const TOKEN_BOUNDARY = /\s/

export function findActiveMention(
  text: string,
  cursorOffset: number,
): MentionMatch | null {
  const offset = Math.max(0, Math.min(cursorOffset, text.length))

  let start = offset
  while (start > 0 && !TOKEN_BOUNDARY.test(text[start - 1]!)) start -= 1

  let end = offset
  while (end < text.length && !TOKEN_BOUNDARY.test(text[end]!)) end += 1

  const token = text.slice(start, end)

  if (!token.startsWith(MENTION_TRIGGER)) return null

  const previousCharacter = start > 0 ? text[start - 1] : undefined
  if (previousCharacter !== undefined && !TOKEN_BOUNDARY.test(previousCharacter)) {
    return null
  }

  if (token.slice(1).includes(MENTION_TRIGGER)) return null

  return {
    start,
    end,
    query: token.slice(1),
  }
}
