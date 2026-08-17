export type ToastVariant = 'info' | 'success' | 'error'

export type ToastOptions = {
  message: string
  variant?: ToastVariant
  duration?: number
}
