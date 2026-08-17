import type { ReactNode } from 'react'

export type DialogSearchListProps<T> = {
  items: T[]
  /** Confirmed choice. Usually closes the dialog. */
  onSelect: (item: T) => void
  /** Fires as the highlight moves. Use for live preview. */
  onHighlight?: (item: T) => void
  /** Return true when the item should survive the current query. */
  filterFn: (item: T, query: string) => boolean
  renderItem: (item: T, isSelected: boolean) => ReactNode
  getKey: (item: T) => string
  placeholder?: string
  emptyText?: string
}
