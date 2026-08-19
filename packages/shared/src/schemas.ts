import { z } from 'zod'

/**
 * Arguments a tool call carries, e.g. `{ path: 'src/index.ts' }`.
 *
 * Deliberately flat: these are rendered into a one-cell terminal row next to
 * the tool name, so a nested structure would have nowhere to go.
 */
export const toolCallArgumentsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
)

export type ToolCallArguments = z.infer<typeof toolCallArgumentsSchema>

/**
 * One piece of an assistant message, as it will be persisted.
 *
 * A message is an ordered list of these rather than a single string, because
 * the model interleaves thinking, tool calls, and prose — and the UI renders
 * each differently. This is the shape stored in `Message.parts`.
 */
export const messagePartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('reasoning'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('tool-call'),
    id: z.string(),
    name: z.string(),
    arguments: toolCallArgumentsSchema,
    result: z.string().optional(),
  }),
  z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
])

export type MessagePart = z.infer<typeof messagePartSchema>

export const messagePartsSchema = z.array(messagePartSchema)

/**
 * Everything the streaming endpoint can emit over server-sent events.
 *
 * Wider than `messagePartSchema` on purpose: this is the wire protocol, with
 * deltas and lifecycle events, while message parts are the settled result. The
 * CLI parses each event against this instead of trusting `JSON.parse` and
 * guessing at the shape from which fields happen to be present.
 */
export const chatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text-delta'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('reasoning-delta'),
    text: z.string(),
  }),
  z.object({
    type: z.literal('tool-call'),
    toolCallId: z.string(),
    toolName: z.string(),
    arguments: toolCallArgumentsSchema,
  }),
  z.object({
    type: z.literal('tool-result'),
    toolCallId: z.string(),
    result: z.string(),
  }),
  z.object({
    type: z.literal('done'),
    messageId: z.string(),
    durationMs: z.number(),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
  }),
])

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>
