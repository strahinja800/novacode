export type ModelPricing = {
  inputPerMillion: number
  outputPerMillion: number
}

export type SupportedProvider = 'anthropic' | 'google' | 'openai'

export type SupportedChatModelDefinition = {
  id: string
  label: string
  provider: SupportedProvider
  pricing: ModelPricing
}

export const SUPPORTED_CHAT_MODELS = [
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    provider: 'google',

    pricing: { inputPerMillion: 0.75, outputPerMillion: 3.75 },
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    provider: 'google',
    pricing: { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    provider: 'google',

    pricing: { inputPerMillion: 0.75, outputPerMillion: 3.75 },
  },
  {
    id: 'claude-opus-5',
    label: 'Opus 5',
    provider: 'anthropic',
    pricing: { inputPerMillion: 5, outputPerMillion: 25 },
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    provider: 'anthropic',
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    provider: 'anthropic',
    pricing: { inputPerMillion: 1, outputPerMillion: 5 },
  },
] as const satisfies readonly SupportedChatModelDefinition[]

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number]

export type SupportedChatModelId = SupportedChatModel['id']

export function findSupportedChatModel(
  id: string,
): SupportedChatModel | undefined {
  return SUPPORTED_CHAT_MODELS.find(model => model.id === id)
}

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = 'gemini-3.7-flash'
