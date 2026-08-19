import { zValidator } from '@hono/zod-validator'
import { database } from '@novacode/database/client'
import { MessageStatus, Mode, Role } from '@novacode/database/enums'
import { findSupportedChatModel } from '@novacode/shared'
import * as Sentry from '@sentry/hono/bun'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  path: z.string().optional(),
  model: z.string().refine(id => findSupportedChatModel(id) !== undefined, {
    message: 'Unsupported model',
  }),
  initialMessage: z
    .object({
      role: z.enum(Role),
      content: z.string(),
      mode: z.enum(Mode),
    })
    .optional(),
})

const createSessionValidator = zValidator(
  'json',
  createSessionSchema,
  (result, c) => {
    if (!result.success) {
      Sentry.logger.warn('Session creation validation failed', {
        path: c.req.path,
        issues: result.error.issues.length,
      })
    }
  },
)

const app = new Hono()
  .get('/', async c => {
    const sessions = await database.session.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    })

    Sentry.logger.info('Fetched sessions', {
      count: sessions.length,
    })

    return c.json(sessions)
  })
  .get('/:id', async c => {
    const id = c.req.param('id')

    const session = await database.session.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      Sentry.logger.warn('Session not found', {
        sessionId: id,
       })

      throw new HTTPException(404, { message: 'Session not found' })
    }

    return c.json(session)
  })
  .post('/', createSessionValidator, async c => {
    const { initialMessage, model, ...data } = c.req.valid('json')

    const session = await database.session.create({
      data: {
        ...data,

        userId: 'mock_user',
        ...(initialMessage && {
          messages: {
            create: {
              ...initialMessage,
              model,
              status: MessageStatus.COMPLETE,
            },
          },
        }),
      },

      include: { messages: true },
    })

    return c.json(session, 201)
  })

export default app
