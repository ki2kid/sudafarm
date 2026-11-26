import { RefreshCw } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

/** User-friendly error banner with a "Try again" button. */
export function RetryError({
  message,
  onRetry,
  retrying = false,
}: {
  message: string
  onRetry: () => void
  retrying?: boolean
}) {
  return (
    <div
      role="alert"
      dir="rtl"
      className="border-destructive/30 bg-destructive/10 text-destructive flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-medium">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
        className="border-destructive/30 text-destructive hover:bg-destructive/15 shrink-0 gap-1.5 self-start sm:self-auto"
      >
        <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
        إعادة المحاولة
      </Button>
    </div>
  )
}
