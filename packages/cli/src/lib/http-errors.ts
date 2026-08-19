/**
 * The three things this needs from a response, and nothing more.
 *
 * Declared structurally rather than as `Response` so it accepts Hono's
 * `ClientResponse` too — the two disagree on `Blob` (DOM vs `node:buffer`)
 * in a way that has no bearing on reading an error message.
 */
type ErrorResponseLike = {
  json: () => Promise<unknown>
  status: number
  statusText: string
}

/**
 * Turn a failed response into something worth showing the user.
 *
 * Every step is guarded, because this runs on the unhappy path and a throw here
 * would take down the TUI while trying to explain that something went wrong.
 * The ladder is: the server's own `error` field, then the status text, then a
 * bare status code.
 */
export async function getErrorMessage(
  response: ErrorResponseLike,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown }

    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error
    }
  } catch {
    // Body was not JSON, or not the shape we expect. Fall through.
  }

  if (response.statusText) {
    return response.statusText
  }

  return `Request failed with status ${response.status}`
}
