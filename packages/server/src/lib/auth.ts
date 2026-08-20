import { createClerkClient } from '@clerk/backend'

const secretKey = process.env.CLERK_SECRET_KEY
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY

if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in your environment')

export const clerkClient = createClerkClient({ secretKey, publishableKey })

export async function authenticateOAuthRequest(
  request: Request,
): Promise<string | null> {
  const requestState = await clerkClient.authenticateRequest(request, {
    acceptsToken: 'oauth_token',
  })

  if (!requestState.isAuthenticated) return null

  const auth = requestState.toAuth()

  if (!auth || auth.tokenType !== 'oauth_token') return null

  return auth.userId ?? null
}
