import { COMMANDS } from '@/constants/commands'
import type { Command } from '@/types/command'

export default function getFilteredCommands(query: string): Command[] {
  if (query.length === 0) return COMMANDS
  return COMMANDS.filter(cmd =>
    cmd.name.toLowerCase().startsWith(query.toLowerCase()),
  )
}
