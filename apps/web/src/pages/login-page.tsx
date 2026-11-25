import { useState } from "react"
import { Link } from "react-router"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"
import { toast } from "../components/toaster"

const DEMO_ACCOUNTS = [
  { label: "مزارع (واتساب + مكالمات)", username: "farmer1", phone: "+249911111111" },
  { label: "مزارع (مكالمات فقط)", username: "farmer2", phone: "+249922222222" },
  { label: "تاجر (واتساب + مكالمات)", username: "trader1", phone: "+249933333333" },
  { label: "تاجر (واتساب فقط)", username: "trader2", phone: "+249944444444" },
]

export function LoginPage() {
  const { error, login, submitting } = useAuth()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  function fillDemoAccount(username: string) {
    setIdentifier(username)
    setPassword("demo1234")
    toast(`تم تعبئة بيانات الحساب التجريبي (${username})`)
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>تسجيل الدخول</CardTitle>
              <CardDescription>سجّل الدخول إلى منصة سودافارم.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-5" onSubmit={login}>
                <div className="space-y-2">
                  <Label htmlFor="identifier">اسم المستخدم أو رقم الجوال</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error && <p className="text-destructive text-sm" role="alert">{error}</p>}
                <Button className="w-full" type="submit" disabled={submitting}>
                  {submitting ? "جار تسجيل الدخول..." : "دخول"}
                </Button>
              </form>

              <p className="text-muted-foreground text-center text-sm">
                ليس لديك حساب؟{" "}
                <Link className="text-primary underline-offset-4 hover:underline" to="/register">
                  إنشاء حساب مزارع أو تاجر
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">حسابات تجريبية للاختبار</CardTitle>
              <CardDescription>كلمة المرور لجميع الحسابات التجريبية: demo1234</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.username}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto flex-col items-start gap-0.5 py-2 text-start"
                  onClick={() => fillDemoAccount(account.username)}
                >
                  <span className="font-medium">{account.label}</span>
                  <span className="text-muted-foreground text-xs">{account.username}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
