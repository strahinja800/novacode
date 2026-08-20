import { Polar } from '@polar-sh/sdk'

const USAGE_EVENT_NAME = 'novacode_usage'
const CREDITS_PROPERTY = 'credits'

type PolarServer = 'sandbox' | 'production'

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) throw new Error(`Missing ${name} in your environment`)

  return value
}

function getPolarServer(): PolarServer {
  return process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
}

export const polar = new Polar({
  accessToken: requireEnv('POLAR_ACCESS_TOKEN'),
  server: getPolarServer(),
})

function hasStatusCode(error: unknown, ...statuses: number[]): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    statuses.includes((error as { statusCode?: number }).statusCode as number)
  )
}

type CreateCheckoutUrlParams = {
  externalCustomerId: string
  requestUrl: string
}

export async function createCheckoutUrl({
  externalCustomerId,
  requestUrl,
}: CreateCheckoutUrlParams): Promise<string> {
  const successUrl = new URL('/billing/success', requestUrl).toString()

  const checkout = await polar.checkouts.create({
    products: [requireEnv('POLAR_PRODUCT_ID')],
    successUrl,
    externalCustomerId,
  })

  return checkout.url
}

export async function createCustomerPortalUrl(
  externalCustomerId: string,
): Promise<string | null> {
  try {
    const session = await polar.customerSessions.create({ externalCustomerId })

    return session.customerPortalUrl
  } catch (caught) {
    if (hasStatusCode(caught, 404, 422)) return null

    throw caught
  }
}

export async function getAvailableCreditsBalance(
  externalCustomerId: string,
): Promise<number> {
  const meterId = requireEnv('POLAR_CREDITS_METER_ID')

  try {
    const state = await polar.customers.getStateExternal({
      externalId: externalCustomerId,
    })

    const meter = state.activeMeters.find(
      candidate => candidate.meterId === meterId,
    )

    return meter?.balance ?? 0
  } catch (caught) {
    if (hasStatusCode(caught, 404)) return 0

    throw caught
  }
}

type IngestAIUsageParams = {
  externalCustomerId: string
  eventId: string
  credits: number
}

export async function ingestAIUsage({
  externalCustomerId,
  eventId,
  credits,
}: IngestAIUsageParams): Promise<void> {
  if (credits <= 0) return

  await polar.events.ingest({
    events: [
      {
        name: USAGE_EVENT_NAME,
        externalCustomerId,
        metadata: {
          [CREDITS_PROPERTY]: credits,
          messageId: eventId,
        },
      },
    ],
  })
}
