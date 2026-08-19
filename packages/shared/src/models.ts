/** What a provider charges, in USD per million tokens. */
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
 * The `openai` provider is kept in the union because the server is
 * provider-agnostic and adding one is a single entry — but an entry needs a
 * verified id and verified pricing, and inventing either would put wrong
 * numbers straight into the billing math.
 */
export const SUPPORTED_CHAT_MODELS = [
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    provider: 'google',
    // List rate through 2026-12-31; Google doubles it on 2027-01-01.
    pricing: { inputPerMillion: 0.75, outputPerMillion: 3.75 },
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    provider: 'google',
    pricing: { inputPerMillion: 0.3, outputPerMillion: 2.5 },
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

/**
 * A model on a provider with a real free tier, so the app runs without a
 * credit card. Switch to an Anthropic id once billing is set up.
 */
export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = 'gemini-3.7-flash'
