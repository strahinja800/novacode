import { zValidator } from '@hono/zod-validator'
import { database } from '@novacode/database/client'
import { MessageStatus, Mode, Role } from '@novacode/database/enums'
import { findSupportedChatModel } from '@novacode/shared'
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

/**
 * Rejecting an unsupported model here, rather than letting the AI SDK fail on
 * it later, is the reason the model list lives in the shared package at all.
 */
const createSessionValidator = zValidator(
  'json',
  createSessionSchema,
  (result, _c) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: result.error.issues.map(issue => issue.message).join(', '),
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

    return c.json(sessions)
  })
  .get('/:id', async c => {
    const session = await database.session.findUnique({
      where: { id: c.req.param('id') },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!session) {
      throw new HTTPException(404, { message: 'Session not found' })
    }

    return c.json(session)
  })
  .post('/', createSessionValidator, async c => {
    // `model` is deliberately not a Session column — it lives on each Message,
    // so the visitor can switch models partway through a conversation. Keep it
    // out of the session payload.
    const { initialMessage, model, ...data } = c.req.valid('json')

    const session = await database.session.create({
      data: {
        ...data,
        // Replaced by the real user id once auth lands in a later chapter.
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
      // The client navigates straight to the session screen and renders these,
      // so returning them here saves an immediate second round trip.
      include: { messages: true },
    })

    return c.json(session, 201)
  })

export default app
