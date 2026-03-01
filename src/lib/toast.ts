// ─── Sistema de toast global (sem dependências externas) ──────────────────────

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

type Listener = (toasts: ToastItem[]) => void

let nextId = 0
let items: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  const snapshot = [...items]
  listeners.forEach(l => l(snapshot))
}

export function toast(message: string, type: ToastType = 'success') {
  const id = ++nextId
  items = [...items, { id, message, type }]
  emit()
  setTimeout(() => dismissToast(id), 3500)
}

export function dismissToast(id: number) {
  items = items.filter(t => t.id !== id)
  emit()
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
