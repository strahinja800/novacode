import { Mode, type ModeType } from '@novacode/shared'
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
  mode: ModeType
  toggleMode: () => void
  setMode: (mode: ModeType) => void
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

export function PromptConfigProvider({ children }: PromptConfigProviderProps) {
  const [mode, setMode] = useState<ModeType>(Mode.BUILD)
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
