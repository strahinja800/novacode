type ErrorResponseLike = {
  json: () => Promise<unknown>
  status: number
  statusText: string
}

export async function getErrorMessage(
  response: ErrorResponseLike,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown }

    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error
    }
  } catch {
    void 0
  }

  if (response.statusText) {
    return response.statusText
  }

  return `Request failed with status ${response.status}`
}
