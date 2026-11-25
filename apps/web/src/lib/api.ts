/** Shared fetch helpers used across listing pages. */

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
