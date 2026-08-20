export type MentionMatch = {
  start: number
  end: number
  query: string
}

export type MentionCandidate = {
  path: string
  label: string
  kind: 'file' | 'directory'
}
