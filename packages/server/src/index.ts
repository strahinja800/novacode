import * as Sentry from '@sentry/hono/bun'
import { sentry } from '@sentry/hono/bun'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { requireAuth } from './middleware/require-auth'
import billing from './routes/billing'
import chat from './routes/chat'
import oauth from './routes/oauth'
import sessions from './routes/sessions'

const app = new Hono()

app.use(
  sentry(app, {
    dsn: 'https://441f8e19881de97144a56567776215c9@o4511937727627264.ingest.de.sentry.io/4511937736671312',
    tracesSampleRate: 1.0,
    enableLogs: true,
    dataCollection: {
    },
  }),
)

app.get('/debug-sentry', () => {
  Sentry.logger.info('User triggered test error', {
    action: 'test_error_endpoint',
  })
  Sentry.metrics.count('test_counter', 1)
  throw new Error('My first Sentry error!')
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    Sentry.logger.warn('Handled HTTP error', {
      status: err.status,
      message: err.message || 'Request failed!',
      path: c.req.path,
      method: c.req.method,
    })

    return c.json({ error: err.message }, err.status)
  }

  Sentry.logger.error('Unhandled error', {
    path: c.req.path,
    method: c.req.method,
    message: err instanceof Error ? err.message : 'Unknown error',
  })

  return c.json({ error: 'Internal server error' }, 500)
})

app.use('/sessions', requireAuth)
app.use('/sessions/*', requireAuth)
app.use('/chat/*', requireAuth)
app.use('/billing/checkout', requireAuth)
app.use('/billing/portal', requireAuth)

const routes = app
  .route('/oauth', oauth)
  .route('/billing', billing)
  .route('/sessions', sessions)
  .route('/chat', chat)

export type { NovaCodeUIMessage } from './routes/chat'

export type AppType = typeof routes

export default {
  port: 3000,
  fetch: routes.fetch,
  idleTimeout: 255,
}
