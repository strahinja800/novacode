import type { ScrollBoxRenderable, TextareaRenderable } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { useKeyboardLayer } from '@/providers/keyboard-layer'

import { findActiveMention } from './find-active-mention'
import { getMentionCandidates } from './get-mention-candidates'
import type { MentionCandidate, MentionMatch } from './types'

const FALLBACK_DEBOUNCE_MS = 120

type UseFileMentionParams = {
  textareaRef: RefObject<TextareaRenderable | null>
  disabled: boolean
}

type UseFileMentionResult = {
  showMentionMenu: boolean
  candidates: MentionCandidate[]
  selectedIndex: number
  scrollRef: RefObject<ScrollBoxRenderable | null>
  setSelectedIndex: (index: number) => void
  syncMentionMenu: () => void
  executeMention: (index: number) => void
}

export function useFileMention({
  textareaRef,
  disabled,
}: UseFileMentionParams): UseFileMentionResult {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<MentionCandidate[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  const activeMentionRef = useRef<MentionMatch | null>(null)
  const mentionQueryRef = useRef<string | null>(null)
  const suppressedTextRef = useRef<string | null>(null)

  const { push, pop, isTopLayer } = useKeyboardLayer()

  const closeMentionMenu = useCallback(() => {
    activeMentionRef.current = null
    mentionQueryRef.current = null
    setMentionQuery(null)
    setCandidates([])
    setSelectedIndex(0)
    pop('mention')
  }, [pop])

  const syncMentionMenu = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || disabled) return

    const text = textarea.plainText

    if (suppressedTextRef.current === text) return
    suppressedTextRef.current = null

    const next = findActiveMention(text, textarea.cursorOffset)
    activeMentionRef.current = next

    if (!next) {
      if (mentionQueryRef.current !== null) closeMentionMenu()
      return
    }

    if (mentionQueryRef.current === null) {
      push('mention', () => {
        closeMentionMenu()
        return true
      })
    }

    if (mentionQueryRef.current !== next.query) {
      mentionQueryRef.current = next.query
      setMentionQuery(next.query)
      setCandidates([])
      setSelectedIndex(0)
      scrollRef.current?.scrollTo(0)
    }
  }, [textareaRef, disabled, push, closeMentionMenu])

  useEffect(() => {
    if (mentionQuery === null) {
      setCandidates([])
      return
    }

    let ignore = false

    void getMentionCandidates(mentionQuery, { allowFallback: false }).then(
      direct => {
        if (ignore || direct.length === 0) return

        setCandidates(direct)
        setSelectedIndex(0)
      },
    )

    const timer = setTimeout(() => {
      void getMentionCandidates(mentionQuery).then(all => {
        if (ignore) return

        setCandidates(all)
        setSelectedIndex(0)
      })
    }, FALLBACK_DEBOUNCE_MS)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [mentionQuery])

  const executeMention = useCallback(
    (index: number) => {
      const textarea = textareaRef.current
      const mention = activeMentionRef.current
      const candidate = candidates[index]

      if (!textarea || !mention || !candidate) return

      const text = textarea.plainText
      const insertion = `@${candidate.path}`
      const nextText =
        text.slice(0, mention.start) + insertion + text.slice(mention.end)

      if (candidate.kind === 'file') suppressedTextRef.current = nextText

      textarea.setText(nextText)
      textarea.cursorOffset = mention.start + insertion.length

      if (candidate.kind === 'directory') syncMentionMenu()
      else closeMentionMenu()
    },
    [textareaRef, candidates, syncMentionMenu, closeMentionMenu],
  )

  useEffect(() => () => pop('mention'), [pop])

  const showMentionMenu = mentionQuery !== null && candidates.length > 0

  useKeyboard(key => {
    if (disabled || !showMentionMenu || !isTopLayer('mention')) return

    if (key.name === 'escape') {
      key.preventDefault()
      closeMentionMenu()
      return
    }

    if (key.name === 'up') {
      key.preventDefault()
      setSelectedIndex(current => {
        const nextIndex = Math.max(0, current - 1)
        const scrollBox = scrollRef.current

        if (scrollBox && nextIndex < scrollBox.scrollTop) {
          scrollBox.scrollTo(nextIndex)
        }

        return nextIndex
      })
      return
    }

    if (key.name === 'down') {
      key.preventDefault()
      setSelectedIndex(current => {
        const nextIndex = Math.min(candidates.length - 1, current + 1)
        const scrollBox = scrollRef.current

        if (scrollBox) {
          const viewportHeight = scrollBox.viewport.height
          const visibleBottom = scrollBox.scrollTop + viewportHeight - 1

          if (nextIndex > visibleBottom) {
            scrollBox.scrollTo(nextIndex - viewportHeight + 1)
          }
        }

        return nextIndex
      })
    }
  })

  return {
    showMentionMenu,
    candidates,
    selectedIndex,
    scrollRef,
    setSelectedIndex,
    syncMentionMenu,
    executeMention,
  }
}
