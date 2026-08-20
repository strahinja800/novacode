import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { createCheckoutUrl, createCustomerPortalUrl } from '../lib/polar'
import type { AuthenticatedEnv } from '../middleware/require-auth'

const app = new Hono<AuthenticatedEnv>()
  .post('/checkout', async c => {
    const url = await createCheckoutUrl({
      externalCustomerId: c.get('userId'),
      requestUrl: c.req.url,
    })

    return c.json({ url })
  })
  .post('/portal', async c => {
    const url = await createCustomerPortalUrl(c.get('userId'))

    if (!url) {
      throw new HTTPException(404, {
        message: 'No billing account yet. Run /upgrade to buy credits first.',
      })
    }

    return c.json({ url })
  })
  .get('/success', c =>
    c.text('Payment complete. You can close this tab and return to NovaCode.'),
  )

export default app
