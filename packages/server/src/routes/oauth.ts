import { Hono } from 'hono'
import { z } from 'zod'

const stateSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  nonce: z.string().min(1),
})

function parseState(encoded: string) {
  try {
    return stateSchema.safeParse(
      JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')),
    )
  } catch {
    return { success: false } as const
  }
}

const app = new Hono().get('/callback', c => {
  const { code, state, error } = c.req.query()

  if (error) {
    const description = c.req.query('error_description') ?? error

    return c.text(`Authentication failed: ${description}`, 400)
  }

  if (!code || !state) {
    return c.text('Authentication failed: incomplete response', 400)
  }

  const parsed = parseState(state)

  if (!parsed.success) {
    return c.text('Authentication failed: invalid state', 400)
  }

  const redirectUrl = new URL(`http://127.0.0.1:${parsed.data.port}/callback`)

  redirectUrl.searchParams.set('code', code)
  redirectUrl.searchParams.set('state', state)

  return c.redirect(redirectUrl.toString())
})

export default app
