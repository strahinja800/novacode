import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import type { ProviderOptions } from '@ai-sdk/provider-utils'
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
} from '@novacode/shared'
import type { LanguageModel } from 'ai'

type AnthropicModelId = Extract<
  SupportedChatModel,
  { provider: 'anthropic' }
>['id']

type GoogleModelId = Extract<SupportedChatModel, { provider: 'google' }>['id']

export type ResolvedModel = {
  model: LanguageModel
  provider: SupportedProvider
  providerOptions?: ProviderOptions
}

const GOOGLE_PROVIDER_OPTIONS: ProviderOptions = {
  google: {
    thinkingConfig: { includeThoughts: true },
  },
}

function assertUnsupportedModel(model: never): never {
  throw new Error(`Unsupported model: ${JSON.stringify(model)}`)
}

function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
  return { model: anthropic(modelId), provider: 'anthropic' }
}

function resolveGoogleModel(modelId: GoogleModelId): ResolvedModel {
  return {
    model: google(modelId),
    provider: 'google',
    providerOptions: GOOGLE_PROVIDER_OPTIONS,
  }
}

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
