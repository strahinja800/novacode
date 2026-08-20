import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

import { PrismaClient } from '../generated/prisma/client.ts'

const here = dirname(fileURLToPath(import.meta.url))

config({ path: join(here, '..', '..', '..', '.env') })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and fill it in.',
  )
}

const adapter = new PrismaPg({ connectionString })

export const database = new PrismaClient({ adapter })
