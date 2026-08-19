import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
} from '@novacode/shared'
import type { LanguageModel } from 'ai'

/**
 * The Anthropic ids we actually support, derived rather than retyped.
 *
 * `Extract` narrows the shared model list by provider, so this union is
 * exactly the ids in `SUPPORTED_CHAT_MODELS` — adding one there widens this
 * automatically, and a typo there fails here instead of at request time.
 */
type AnthropicModelId = Extract<
  SupportedChatModel,
  { provider: 'anthropic' }
>['id']

type GoogleModelId = Extract<SupportedChatModel, { provider: 'google' }>['id']

/**
 * A model ready to hand to `streamText`.
 *
 * An object rather than a bare `LanguageModel` because provider-specific call
 * settings land next to the model as the app grows.
 */
export type ResolvedModel = {
  model: LanguageModel
}

/**
 * Called only from a `switch` default, with a value TypeScript has narrowed to
 * `never`. If a provider is ever added to the shared list without a branch
 * here, the argument stops being `never` and this line fails to compile.
 *
 * It takes the whole model rather than the provider so that the `never` is
 * reached by elimination on the union itself.
 */
function assertUnsupportedModel(model: never): never {
  throw new Error(`Unsupported model: ${JSON.stringify(model)}`)
}

function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
  return { model: anthropic(modelId) }
}

function resolveGoogleModel(modelId: GoogleModelId): ResolvedModel {
  return { model: google(modelId) }
}

/**
 * One function per provider rather than a lookup table, because each of them
 * grows its own call settings as the app does.
 */
function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  switch (model.provider) {
    case 'anthropic':
      return resolveAnthropicModel(model.id)
    case 'google':
      return resolveGoogleModel(model.id)
    default:
      return assertUnsupportedModel(model)
  }
}

export function isSupportedChatModel(
  modelId: string,
): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) !== undefined
}

export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId)

  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`)
  }

  return resolveSupportedChatModel(model)
}
