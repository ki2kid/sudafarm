import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"
import { RetryError } from "../components/retry-error"
import { formatErrorMessage } from "../lib/api"

type State = { id: number; name_ar: string; name_en: string; code: string }
type Locality = { id: number; state_id: number; name_ar: string; name_en: string }
type Neighborhood = { id: number; locality_id: number; name_ar: string; name_en: string }
type ApiError = { detail?: string }

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...options })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError
    throw new Error(body.detail ?? "تعذر تنفيذ الطلب.")
  }
  return (await response.json()) as T
}

export function LocationsPage() {
  const { user } = useAuth()
  const [states, setStates] = useState<State[]>([])
  const [localities, setLocalities] = useState<Locality[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    Promise.all([
      request<State[]>("/api/locations/states"),
      request<Locality[]>("/api/locations/localities"),
      request<Neighborhood[]>("/api/locations/neighborhoods"),
    ])
      .then(([nextStates, nextLocalities, nextNeighborhoods]) => {
        setStates(nextStates)
        setLocalities(nextLocalities)
        setNeighborhoods(nextNeighborhoods)
      })
      .catch((loadError) => setError(formatErrorMessage(loadError, "تعذر تحميل البيانات.")))
      .finally(() => setLoading(false))
  }, [retryTick])

  if (!user?.is_superuser) {
    return (
      <div className="bg-muted/30 min-h-svh" dir="rtl">
        <Navbar />
        <main id="main-content" className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl items-center justify-center p-6">
          <Card className="w-full max-w-lg"><CardContent className="pt-6">هذه الصفحة متاحة للمشرفين فقط.</CardContent></Card>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">المواقع</h1>
          <p className="text-muted-foreground text-sm">عرض التقسيمات الجغرافية المعتمدة.</p>
        </header>
        {loading && <p role="status">جار تحميل البيانات…</p>}
        {error && (
          <RetryError
            message={error}
            retrying={loading}
            onRetry={() => {
              setError("")
              setLoading(true)
              setRetryTick((t) => t + 1)
            }}
          />
        )}

        <Card>
          <CardHeader><CardTitle>التقسيمات الجغرافية</CardTitle><CardDescription>البيانات المرجعية للمناطق والمحليات والأحياء.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div><p className="font-medium">{states.length}</p><p className="text-muted-foreground text-sm">المناطق</p></div>
            <div><p className="font-medium">{localities.length}</p><p className="text-muted-foreground text-sm">المحليات</p></div>
            <div><p className="font-medium">{neighborhoods.length}</p><p className="text-muted-foreground text-sm">الأحياء</p></div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
