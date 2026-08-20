import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import { getAvailableCreditsBalance } from '../lib/polar'
import type { AuthenticatedEnv } from './require-auth'

export const requireCreditsBalance = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    const userId = c.get('userId')

    let balance: number

    try {
      balance = await getAvailableCreditsBalance(userId)
    } catch {
      throw new HTTPException(402, {
        message: 'Could not check your credit balance. Try again shortly.',
      })
    }

    if (balance <= 0) {
      throw new HTTPException(402, {
        message: 'No credits remaining. Run /upgrade to buy more.',
      })
    }

    await next()
  },
)
