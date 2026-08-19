import { Mode } from '@novacode/database/enums'

import { createBashTool } from './bash'
import { createEditFileTool } from './edit-file'
import { createGlobTool } from './glob'
import { createGrepTool } from './grep'
import { createListDirectoryTool } from './list-directory'
import { createReadFileTool } from './read-file'
import { createWriteFileTool } from './write-file'

type CreateToolsParams = {
  cwd: string
  mode: Mode
}

/**
 * The tools a turn is allowed to use.
 *
 * Plan mode is read-only by construction rather than by instruction: the tools
 * that change things are simply absent, so the model cannot ignore the system
 * prompt and write a file anyway.
 */
export function createTools({ cwd, mode }: CreateToolsParams) {
  const readOnlyTools = {
    read_file: createReadFileTool(cwd),
    list_directory: createListDirectoryTool(cwd),
    glob: createGlobTool(cwd),
    grep: createGrepTool(cwd),
  }

  if (mode === Mode.PLAN) return readOnlyTools

  return {
    ...readOnlyTools,
    write_file: createWriteFileTool(cwd),
    edit_file: createEditFileTool(cwd),
    bash: createBashTool(cwd),
  }
}
