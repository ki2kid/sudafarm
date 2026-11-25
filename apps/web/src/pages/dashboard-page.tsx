import { useEffect, useState } from "react"
import { MessageCircle, Phone } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { useAuth } from "../auth/auth-context"
import type { AccountType } from "../auth/auth-context"
import { Navbar } from "../components/navbar"

type DirectoryAccount = {
  id: number
  username: string
  arabic_full_name: string
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

function formatWhatsAppUrl(rawPhone: string) {
  const digits = rawPhone.replace(/[^\d]/g, "")
  return `https://wa.me/${digits}`
}

function accountTypeLabel(type: AccountType) {
  return type === "farmer" ? "مزارع" : "تاجر"
}

export function DashboardPage() {
  const { error, logout, submitting, user } = useAuth()
  const [accounts, setAccounts] = useState<DirectoryAccount[]>([])
  const [filter, setFilter] = useState<"all" | AccountType>(
    user?.account_type === "farmer" ? "trader" : "farmer",
  )
  const [loadingDirectory, setLoadingDirectory] = useState(true)
  const [directoryError, setDirectoryError] = useState("")

  useEffect(() => {
    setLoadingDirectory(true)
    setDirectoryError("")
    const query = filter === "all" ? "" : `?account_type=${filter}`
    fetch(`/api/auth/directory${query}`, { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("تعذر تحميل دليل الحسابات.")
        }
        setAccounts((await response.json()) as DirectoryAccount[])
      })
      .catch((loadError) => {
        setDirectoryError(loadError instanceof Error ? loadError.message : "تعذر تحميل دليل الحسابات.")
      })
      .finally(() => setLoadingDirectory(false))
  }, [filter])

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl space-y-6 p-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>مرحباً، {user?.arabic_full_name}</CardTitle>
                {user && (
                  <span className="bg-primary/10 text-primary rounded-full px-3 py-0.5 text-xs font-medium">
                    حساب {accountTypeLabel(user.account_type)}
                  </span>
                )}
              </div>
              <CardDescription>
                {user?.state_name_ar && user?.locality_name_ar
                  ? `${user.state_name_ar} - ${user.locality_name_ar}`
                  : user?.phone}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={logout} disabled={submitting}>
              {submitting ? "جار التنفيذ..." : "تسجيل الخروج"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {user?.bio && <p className="text-sm">{user.bio}</p>}
            <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
              <span>رقم الجوال: {user?.phone}</span>
              {user?.allow_whatsapp && <span>واتساب: {user.whatsapp_number}</span>}
              {user?.allow_call && <span>مكالمات: {user.call_phone}</span>}
            </div>
            {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">دليل المزارعين والتجار</h2>
              <p className="text-muted-foreground text-sm">
                تواصل مباشرة مع التجار أو المزارعين عبر الواتساب أو المكالمات.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filter === "trader" ? "default" : "outline"}
                onClick={() => setFilter("trader")}
              >
                التجار
              </Button>
              <Button
                size="sm"
                variant={filter === "farmer" ? "default" : "outline"}
                onClick={() => setFilter("farmer")}
              >
                المزارعون
              </Button>
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                الكل
              </Button>
            </div>
          </div>

          {loadingDirectory && <p className="text-muted-foreground text-sm" role="status">جار تحميل الحسابات…</p>}
          {directoryError && <p className="text-destructive text-sm" role="alert">{directoryError}</p>}

          {!loadingDirectory && accounts.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground pt-6 text-sm">
                لا توجد حسابات مطابقة حالياً.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{account.arabic_full_name}</CardTitle>
                        <CardDescription>
                          {account.state_name_ar && account.locality_name_ar
                            ? `${account.state_name_ar} - ${account.locality_name_ar}`
                            : account.username}
                        </CardDescription>
                      </div>
                      <span className="bg-muted text-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {accountTypeLabel(account.account_type)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {account.bio && <p className="text-sm">{account.bio}</p>}
                    <div className="flex flex-wrap gap-2">
                      {account.allow_whatsapp && account.whatsapp_number && (
                        <a
                          href={formatWhatsAppUrl(account.whatsapp_number)}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
                        >
                          <MessageCircle className="size-3.5" aria-hidden="true" />
                          <span>واتساب ({account.whatsapp_number})</span>
                        </a>
                      )}
                      {account.allow_call && account.call_phone && (
                        <a
                          href={`tel:${account.call_phone}`}
                          className="border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                        >
                          <Phone className="size-3.5" aria-hidden="true" />
                          <span>اتصال ({account.call_phone})</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
