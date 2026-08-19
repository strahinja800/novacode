/**
 * Types only. The `database` instance is deliberately **not** re-exported here.
 *
 * Re-exporting it would mean any import from `@novacode/database` — even one
 * that only wants a `Session` type — evaluates `client.ts` and throws when
 * `DATABASE_URL` is missing. Consumers that need the connection import from
 * `@novacode/database/client`; consumers that need enum values at runtime
 * import from `@novacode/database/enums`.
 */
export type { Prisma } from '../generated/prisma/client.ts'
export type {
  MessageModel,
  SessionModel,
} from '../generated/prisma/models.ts'
