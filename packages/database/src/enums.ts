/**
 * Enums only, as their own entry point.
 *
 * The server needs these values at runtime for Zod validation, but importing
 * them from the package root would drag in `client.ts` — and with it the whole
 * Prisma runtime and the `DATABASE_URL` requirement. A separate export keeps
 * "I need the string `USER`" from meaning "I need a database connection".
 */
export {
  MessageStatus,
  Mode,
  Role,
} from '../generated/prisma/enums.ts'
