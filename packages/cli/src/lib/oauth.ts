import { createHash, randomBytes, randomUUID } from 'node:crypto'
import process from 'node:process'

import open from 'open'
import { z } from 'zod'

import { saveAuth } from './auth'

const LOGIN_TIMEOUT_MS = 120_000
const SCOPES = 'openid profile email offline_access'

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
})

const oauthStateSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  nonce: z.string().min(1),
})

type OAuthState = z.infer<typeof oauthStateSchema>

function base64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function createCodeChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest())
}

function encodeState(state: OAuthState): string {
  return base64Url(Buffer.from(JSON.stringify(state), 'utf8'))
}

function decodeState(encoded: string): OAuthState {
  const json = Buffer.from(encoded, 'base64url').toString('utf8')

  return oauthStateSchema.parse(JSON.parse(json))
}

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) throw new Error(`Missing ${name} in your environment`)

  return value.replace(/\/$/, '')
}

function toOrigin(frontendApi: string): string {
  return frontendApi.startsWith('http')
    ? frontendApi
    : `https://${frontendApi}`
}

export async function performLogin(): Promise<void> {
  const frontendApi = toOrigin(requireEnv('CLERK_FRONTEND_API'))
  const clientId = requireEnv('CLERK_OAUTH_CLIENT_ID')
  const apiUrl = requireEnv('API_URL')

  const nonce = randomUUID()
  const codeVerifier = base64Url(randomBytes(32))
  const codeChallenge = createCodeChallenge(codeVerifier)
  const redirectUri = `${apiUrl}/oauth/callback`

  await new Promise<void>((resolve, reject) => {
    let settled = false

    const server = Bun.serve({
      port: 0,
      fetch: async request => {
        const url = new URL(request.url)

        if (url.pathname !== '/callback') {
          return new Response('Not found', { status: 404 })
        }

        const finish = (
          outcome: () => void,
          body: string,
          status: number,
        ): Response => {
          settled = true
          outcome()
          setTimeout(() => void server.stop(true), 200)

          return new Response(body, { status })
        }

        const failure = url.searchParams.get('error')

        if (failure) {
          const description =
            url.searchParams.get('error_description') ?? failure

          return finish(
            () => reject(new Error(description)),
            'Authentication failed. You can close this tab.',
            400,
          )
        }

        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')

        if (!code || !state) {
          return finish(
            () => reject(new Error('Authorization response was incomplete')),
            'Authentication failed. You can close this tab.',
            400,
          )
        }

        try {
          if (decodeState(state).nonce !== nonce) {
            throw new Error('State mismatch')
          }
        } catch {
          return finish(
            () => reject(new Error('Invalid authentication state')),
            'Authentication failed. You can close this tab.',
            400,
          )
        }

        try {
          const response = await fetch(`${frontendApi}/oauth/token`, {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri,
              client_id: clientId,
              code_verifier: codeVerifier,
            }),
          })

          if (!response.ok) {
            const detail = await response.text()

            throw new Error(
              detail.slice(0, 200) || `Token request failed (${response.status})`,
            )
          }

          const token = tokenResponseSchema.parse(await response.json())

          saveAuth(token.access_token)

          return finish(
            resolve,
            'Signed in to NovaCode. You can close this tab.',
            200,
          )
        } catch (caught) {
          const message =
            caught instanceof Error ? caught.message : 'Token exchange failed'

          return finish(
            () => reject(new Error(message)),
            'Authentication failed. You can close this tab.',
            500,
          )
        }
      },
    })

    const parsedPort = oauthStateSchema.shape.port.safeParse(server.port)

    if (!parsedPort.success) {
      void server.stop(true)
      reject(new Error('Could not open a local callback port'))
      return
    }

    const authorizeUrl = new URL(`${frontendApi}/oauth/authorize`)

    authorizeUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state: encodeState({ port: parsedPort.data, nonce }),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString()

    void open(authorizeUrl.toString())

    setTimeout(() => {
      if (settled) return

      settled = true
      void server.stop(true)
      reject(new Error('Login timed out. Run /login to try again.'))
    }, LOGIN_TIMEOUT_MS)
  })
}
