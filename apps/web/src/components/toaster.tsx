import { useEffect, useState } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

type ToastVariant = "default" | "success" | "error"

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type Listener = (toasts: ToastItem[]) => void

let nextId = 1
let items: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(items)
}

function addToast(message: string, variant: ToastVariant = "default") {
  const id = nextId++
  items = [...items, { id, message, variant }]
  emit()
  window.setTimeout(() => dismissToast(id), 4000)
  return id
}

function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id)
  emit()
}

export const toast = Object.assign(
  (message: string) => addToast(message, "default"),
  {
    success: (message: string) => addToast(message, "success"),
    error: (message: string) => addToast(message, "error"),
    dismiss: dismissToast,
  }
)

export function Toaster({ dir = "rtl" }: { dir?: "rtl" | "ltr" }) {
  const [toasts, setToasts] = useState<ToastItem[]>(items)

  useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      dir={dir}
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((item) => {
        const Icon =
          item.variant === "success"
            ? CheckCircle2
            : item.variant === "error"
              ? AlertCircle
              : Info
        const variantClasses =
          item.variant === "success"
            ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
            : item.variant === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20"
              : "border-border bg-background text-foreground"

        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm shadow-lg transition-all ${variantClasses}`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="إغلاق"
              className="opacity-60 hover:opacity-100 shrink-0 rounded p-0.5 transition-opacity"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
