/** What a provider charges, in USD per million tokens. */
export type ModelPricing = {
  inputPerMillion: number
  outputPerMillion: number
}

export type SupportedProvider = 'anthropic' | 'openai'

export type SupportedChatModelDefinition = {
  id: string
  label: string
  provider: SupportedProvider
  pricing: ModelPricing
}

/**
 * The models this app is willing to run.
 *
 * `as const satisfies` is doing real work here: `satisfies` checks every entry
 * against the shape (a typo in `provider` fails the build), while `as const`
 * keeps the literal ids so `SupportedChatModelId` is a union of exactly these
 * strings rather than plain `string`.
 *
 * Prices are the providers' list rates. We bill against list rather than our
 * actual cost, so prompt caching on the provider's side stays margin instead of
 * becoming a discount we have to model.
 *
 * Only Anthropic models ship today. The `openai` provider is kept in the union
 * because the server is provider-agnostic and adding one is a single entry —
 * but an entry needs a verified id and verified pricing, and inventing either
 * would put wrong numbers straight into the billing math.
 */
export const SUPPORTED_CHAT_MODELS = [
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

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = 'claude-opus-5'
