import type { AppType } from '@novacode/server'
import { hc } from 'hono/client'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

/**
 * Typed client for our own server.
 *
 * `AppType` comes from the server package as a *type only*, which is why the
 * server sits in devDependencies — the types are erased at build time and no
 * server code ends up in the CLI bundle.
 */
export const apiClient = hc<AppType>(API_URL)
