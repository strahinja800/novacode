import type { ReactNode } from 'react'

export type DialogSearchListProps<T> = {
  items: T[]

  onSelect: (item: T) => void

  onHighlight?: (item: T) => void

  filterFn: (item: T, query: string) => boolean
  renderItem: (item: T, isSelected: boolean) => ReactNode
  getKey: (item: T) => string
  placeholder?: string
  emptyText?: string
}
