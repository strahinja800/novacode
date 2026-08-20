import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import { authenticateOAuthRequest } from '../lib/auth'

export type AuthenticatedEnv = {
  Variables: {
    userId: string
  }
}

export const requireAuth = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    const userId = await authenticateOAuthRequest(c.req.raw)

    if (!userId) {
      throw new HTTPException(401, { message: 'Sign in with /login' })
    }

    c.set('userId', userId)

    await next()
  },
)
