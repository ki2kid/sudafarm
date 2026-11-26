/** Shared fetch helpers used across listing pages. */

const NETWORK_ERROR_MESSAGE = "تعذر الاتصال بالإنترنت. يرجى التحقق من الشبكة والمحاولة مرة أخرى."

/** Converts raw network/fetch errors into clear Arabic messages for end users. */
export function formatErrorMessage(error: unknown, fallback: string): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return NETWORK_ERROR_MESSAGE
  }
  if (error instanceof TypeError) {
    return NETWORK_ERROR_MESSAGE
  }
  if (error instanceof Error) {
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(error.message)) {
      return NETWORK_ERROR_MESSAGE
    }
    return error.message || fallback
  }
  return fallback
}

export async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" })
  if (!response.ok) throw new Error("تعذر تهيئة الحماية.")
  const body = (await response.json()) as { token: string }
  return body.token
}

export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...options })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string }
    throw new Error(body.detail ?? "تعذر تنفيذ الطلب.")
  }
  return response.json() as Promise<T>
}
