import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

/**
 * Resolve the repo root from this file, not from the working directory.
 *
 * The generated config used a bare `dotenv/config`, which resolves `.env`
 * relative to wherever the command happened to be run — so `bunx prisma` from
 * the repo root and from this package would look in two different places and
 * one of them would find nothing. Anchoring to `import.meta.url` makes the
 * lookup identical from anywhere.
 */
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')

config({ path: join(repoRoot, '.env') })

export default defineConfig({
  schema: join(here, 'prisma', 'schema.prisma'),
  migrations: {
    path: join(here, 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
