import { TextAttributes } from '@opentui/core'
import { format } from 'date-fns'
import type { InferResponseType } from 'hono/client'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { DialogSearchList } from '@/components/dialog-search-list'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/http-errors'
import { useDialog } from '@/providers/dialog'
import { useThemeColors } from '@/providers/theme'
import { useToast } from '@/providers/toast'

/**
 * The list route selects only three columns, and this follows it — so trimming
 * that `select` on the server breaks the build here rather than the render.
 */
type SessionSummary = InferResponseType<
  typeof apiClient.sessions.$get,
  200
>[number]

const TIMESTAMP_COL_WIDTH = 14

export function SessionsDialog() {
  const colors = useThemeColors()
  const { close } = useDialog()
  const { show } = useToast()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    const fetchSessions = async () => {
      try {
        const response = await apiClient.sessions.$get()

        if (ignore) return

        if (!response.ok) {
          throw new Error(await getErrorMessage(response))
        }

        const data = await response.json()

        if (ignore) return

        setSessions(data)
        setLoading(false)
      } catch (caught) {
        if (ignore) return

        show({
          variant: 'error',
          message:
            caught instanceof Error
              ? caught.message
              : 'Failed to load sessions',
        })
        close()
      }
    }

    void fetchSessions()

    return () => {
      ignore = true
    }
  }, [show, close])

  const handleSelect = useCallback(
    (session: SessionSummary) => {
      close()
      navigate(`/sessions/${session.id}`)
    },
    [close, navigate],
  )

  if (loading) {
    return (
      <text
        fg={colors.muted}
        attributes={TextAttributes.DIM}
      >
        Loading sessions...
      </text>
    )
  }

  return (
    <DialogSearchList<SessionSummary>
      items={sessions}
      onSelect={handleSelect}
      getKey={item => item.id}
      filterFn={(item, query) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      }
      placeholder='Filter sessions...'
      emptyText='No sessions yet'
      renderItem={(item, isSelected) => (
        <>
          <box
            flexGrow={1}
            flexShrink={1}
            overflow='hidden'
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.fg}
            >
              {item.title}
            </text>
          </box>
          <box
            width={TIMESTAMP_COL_WIDTH}
            flexShrink={0}
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.muted}
              attributes={isSelected ? undefined : TextAttributes.DIM}
            >
              {format(new Date(item.createdAt), 'MMM d, HH:mm')}
            </text>
          </box>
        </>
      )}
    />
  )
}
