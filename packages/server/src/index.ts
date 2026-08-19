import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import sessions from './routes/sessions'

const app = new Hono()

/**
 * One error shape for the whole API, so the CLI has exactly one thing to parse.
 * See `getErrorMessage` on the client side, which reads the `error` field.
 */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }

  console.error('Unhandled server error:', err)

  return c.json({ error: 'Internal server error' }, 500)
})

const routes = app.route('/sessions', sessions)

export type AppType = typeof routes

export default {
  port: 3000,
  fetch: routes.fetch,
  // Tool calls in a single turn can run far longer than Bun's ~10s default.
  // Without this, long agentic turns are cut off mid-flight in chapter 9.
  idleTimeout: 255,
}
