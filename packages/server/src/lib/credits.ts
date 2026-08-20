import {
  findSupportedChatModel,
  type ModelPricing,
  type SupportedProvider,
} from '@novacode/shared'
import type { LanguageModelUsage } from 'ai'

const TOKENS_PER_MILLION = 1_000_000
const USD_PER_CREDIT = 0.01

type TokenCounts = {
  inputTokens: number
  outputTokens: number
}

export type BillableUsage = {
  inputTokens: number
  outputTokens: number
  estimatedCostInUsd: number
  credits: number
}

function requireTokenCount(value: number | undefined, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(`Usage reported an unusable ${label}: ${String(value)}`)
  }

  return value
}

function getTokenCounts(usage: LanguageModelUsage): TokenCounts {
  return {
    inputTokens: requireTokenCount(usage.inputTokens, 'input token count'),
    outputTokens: requireTokenCount(usage.outputTokens, 'output token count'),
  }
}

function getModelPricing(
  provider: SupportedProvider,
  modelId: string,
): ModelPricing {
  const model = findSupportedChatModel(modelId)

  if (!model) throw new Error(`Unsupported model: ${modelId}`)
  if (model.provider !== provider) {
    throw new Error(`Model ${modelId} does not belong to provider ${provider}`)
  }

  return model.pricing
}

function estimateCostInUsd(
  { inputTokens, outputTokens }: TokenCounts,
  pricing: ModelPricing,
): number {
  return (
    (inputTokens / TOKENS_PER_MILLION) * pricing.inputPerMillion +
    (outputTokens / TOKENS_PER_MILLION) * pricing.outputPerMillion
  )
}

function convertUsdToCredits(estimatedCostInUsd: number): number {
  return Math.ceil(estimatedCostInUsd / USD_PER_CREDIT)
}

type CalculateCreditsForUsageParams = {
  provider: SupportedProvider
  model: string
  usage: LanguageModelUsage
}

export function calculateCreditsForUsage({
  provider,
  model,
  usage,
}: CalculateCreditsForUsageParams): BillableUsage {
  const tokenCounts = getTokenCounts(usage)
  const pricing = getModelPricing(provider, model)
  const estimatedCostInUsd = estimateCostInUsd(tokenCounts, pricing)

  return {
    ...tokenCounts,
    estimatedCostInUsd,
    credits: convertUsdToCredits(estimatedCostInUsd),
  }
}
