import { createContext, useContext, useEffect, useState } from "react"
import type { FormEvent, ReactNode } from "react"

import { toast } from "../components/toaster"

export type AccountType = "farmer" | "trader"

export type User = {
  id: number
  username: string
  phone: string
  arabic_full_name: string
  is_superuser: boolean
  account_type: AccountType
  allow_whatsapp: boolean
  whatsapp_number: string
  allow_call: boolean
  call_phone: string
  locality_id: number | null
  locality_name_ar: string | null
  state_name_ar: string | null
  bio: string
}

export type RegisterPayload = {
  username: string
  phone: string
  arabic_full_name: string
  password: string
  account_type: AccountType
  allow_whatsapp: boolean
  whatsapp_number: string
  allow_call: boolean
  call_phone: string
  locality_id: number | null
  bio: string
}

export type ProfileUpdatePayload = {
  arabic_full_name?: string
  allow_whatsapp?: boolean
  whatsapp_number?: string
  allow_call?: boolean
  call_phone?: string
  locality_id?: number | null
  bio?: string
}

type ApiError = {
  detail?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  submitting: boolean
  error: string
  login: (event: FormEvent<HTMLFormElement>) => Promise<void>
  register: (payload: RegisterPayload) => Promise<boolean>
  updateProfile: (payload: ProfileUpdatePayload) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as ApiError
  return body.detail ?? fallback
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" })
  if (!response.ok) {
    throw new Error("تعذر تهيئة الحماية.")
  }
  const body = (await response.json()) as { token: string }
  return body.token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (response.ok) {
          setUser((await response.json()) as User)
        }
      })
      .catch(() => setError("تعذر الاتصال بالخادم."))
      .finally(() => setLoading(false))
  }, [])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const formData = new FormData(event.currentTarget)

    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({
          identifier: formData.get("identifier"),
          password: formData.get("password"),
        }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, "بيانات الدخول غير صحيحة."))
      }
      const loggedInUser = (await response.json()) as User
      setUser(loggedInUser)
      toast.success(`مرحباً بك، ${loggedInUser.arabic_full_name}!`)
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "تعذر تسجيل الدخول."
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function register(payload: RegisterPayload): Promise<boolean> {
    setSubmitting(true)
    setError("")
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(await readError(response, "تعذر إنشاء الحساب."))
      }
      const createdUser = (await response.json()) as User
      setUser(createdUser)
      toast.success(`تم إنشاء حسابك بنجاح، أهلاً بك يا ${createdUser.arabic_full_name}!`)
      return true
    } catch (registerError) {
      const message = registerError instanceof Error ? registerError.message : "تعذر إنشاء الحساب."
      setError(message)
      toast.error(message)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function updateProfile(payload: ProfileUpdatePayload): Promise<boolean> {
    setSubmitting(true)
    setError("")
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(await readError(response, "تعذر تحديث الملف الشخصي."))
      }
      const updatedUser = (await response.json()) as User
      setUser(updatedUser)
      toast.success("تم تحديث الملف الشخصي بنجاح.")
      return true
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "تعذر تحديث الملف الشخصي."
      setError(message)
      toast.error(message)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function logout() {
    setSubmitting(true)
    setError("")
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRFToken": csrfToken },
      })
      if (!response.ok) {
        throw new Error(await readError(response, "تعذر تسجيل الخروج."))
      }
      setUser(null)
      toast.success("تم تسجيل الخروج بنجاح.")
    } catch (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : "تعذر تسجيل الخروج."
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, submitting, error, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
