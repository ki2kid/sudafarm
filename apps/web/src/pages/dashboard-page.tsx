import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"

export function DashboardPage() {
  const { error, logout, submitting, user } = useAuth()

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>مرحباً، {user?.arabic_full_name}</CardTitle>
            <CardDescription>تم التحقق من جلسة الدخول الحالية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{user?.phone}</p>
            {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
            <Button className="w-full" onClick={logout} disabled={submitting}>
              {submitting ? "جار التنفيذ..." : "تسجيل الخروج"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
