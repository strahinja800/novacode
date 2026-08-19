import { Mode } from '@novacode/database/enums'
import {
  DEFAULT_CHAT_MODEL_ID,
  type SupportedChatModelId,
} from '@novacode/shared'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

export type PromptConfigContextValue = {
  mode: Mode
  toggleMode: () => void
  setMode: (mode: Mode) => void
  model: SupportedChatModelId
  setModel: (model: SupportedChatModelId) => void
}

const PromptConfigContext = createContext<PromptConfigContextValue | null>(null)

export function usePromptConfig(): PromptConfigContextValue {
  const value = useContext(PromptConfigContext)

  if (!value) {
    throw new Error(
      'usePromptConfig must be used within a PromptConfigProvider',
    )
  }

  return value
}

type PromptConfigProviderProps = {
  children: ReactNode
}

/**
 * How the next message will be sent: in which mode, by which model.
 *
 * Deliberately not persisted, unlike the theme. A theme is how the visitor
 * wants the app to look; mode and model are decisions about the conversation
 * in front of them, and carrying yesterday's choice into a fresh start would
 * be a surprise rather than a convenience.
 */
export function PromptConfigProvider({ children }: PromptConfigProviderProps) {
  const [mode, setMode] = useState<Mode>(Mode.BUILD)
  const [model, setModel] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  )

  const toggleMode = useCallback(() => {
    setMode(current => (current === Mode.BUILD ? Mode.PLAN : Mode.BUILD))
  }, [])

  const value = useMemo<PromptConfigContextValue>(
    () => ({ mode, toggleMode, setMode, model, setModel }),
    [mode, toggleMode, model],
  )

  return (
    <PromptConfigContext.Provider value={value}>
      {children}
    </PromptConfigContext.Provider>
  )
}
