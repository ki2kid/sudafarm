import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"

export function LoginPage() {
  const { error, login, submitting } = useAuth()

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>تسجيل الدخول</CardTitle>
            <CardDescription>سجّل الدخول إلى منصة إسناد لإدارة عمليات المستشفى.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={login}>
              <div className="space-y-2">
                <Label htmlFor="identifier">اسم المستخدم أو رقم الجوال</Label>
                <Input id="identifier" name="identifier" autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? "جار تسجيل الدخول..." : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
