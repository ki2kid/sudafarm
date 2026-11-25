import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

import { useAuth } from "../auth/auth-context"
import type { AccountType } from "../auth/auth-context"
import { Navbar } from "../components/navbar"

type Locality = { id: number; state_id: number; name_ar: string; name_en: string }

type FieldStatus = "idle" | "checking" | "available" | "taken"

function FieldHint({ status, takenMessage }: { status: FieldStatus; takenMessage: string }) {
  if (status === "checking")
    return <p className="text-muted-foreground text-xs">جار التحقق…</p>
  if (status === "taken")
    return <p className="text-destructive text-xs" role="alert">{takenMessage}</p>
  if (status === "available")
    return <p className="text-green-600 dark:text-green-400 text-xs">✓ متاح</p>
  return null
}

const DEBOUNCE_MS = 500

export function RegisterPage() {
  const { error, register, submitting } = useAuth()

  const [accountType, setAccountType] = useState<AccountType>("farmer")
  const [username, setUsername] = useState("")
  const [arabicFullName, setArabicFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [allowWhatsapp, setAllowWhatsapp] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [allowCall, setAllowCall] = useState(true)
  const [callPhone, setCallPhone] = useState("")
  const [localityId, setLocalityId] = useState("")
  const [bio, setBio] = useState("")
  const [localities, setLocalities] = useState<Locality[]>([])
  const [validationError, setValidationError] = useState("")

  // ---- availability check state ----
  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>("idle")
  const [phoneStatus, setPhoneStatus] = useState<FieldStatus>("idle")
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameAbort = useRef<AbortController | null>(null)
  const phoneAbort = useRef<AbortController | null>(null)

  // ---- load localities once ----
  useEffect(() => {
    fetch("/api/locations/localities", { credentials: "same-origin" })
      .then(async (res) => {
        if (res.ok) setLocalities((await res.json()) as Locality[])
      })
      .catch(() => {})
  }, [])

  // ---- debounced availability helpers ----
  function checkUsername(value: string) {
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    usernameAbort.current?.abort()
    if (!value.trim()) { setUsernameStatus("idle"); return }
    setUsernameStatus("checking")
    usernameTimer.current = setTimeout(async () => {
      const ctrl = new AbortController()
      usernameAbort.current = ctrl
      try {
        const res = await fetch(
          `/api/auth/check-availability?username=${encodeURIComponent(value.trim())}`,
          { credentials: "same-origin", signal: ctrl.signal },
        )
        if (!res.ok) { setUsernameStatus("idle"); return }
        const data = (await res.json()) as { username_taken: boolean; phone_taken: boolean }
        setUsernameStatus(data.username_taken ? "taken" : "available")
      } catch {
        setUsernameStatus("idle")
      }
    }, DEBOUNCE_MS)
  }

  function checkPhone(value: string) {
    if (phoneTimer.current) clearTimeout(phoneTimer.current)
    phoneAbort.current?.abort()
    if (!value.trim()) { setPhoneStatus("idle"); return }
    setPhoneStatus("checking")
    phoneTimer.current = setTimeout(async () => {
      const ctrl = new AbortController()
      phoneAbort.current = ctrl
      try {
        const res = await fetch(
          `/api/auth/check-availability?phone=${encodeURIComponent(value.trim())}`,
          { credentials: "same-origin", signal: ctrl.signal },
        )
        if (!res.ok) { setPhoneStatus("idle"); return }
        const data = (await res.json()) as { username_taken: boolean; phone_taken: boolean }
        setPhoneStatus(data.phone_taken ? "taken" : "available")
      } catch {
        setPhoneStatus("idle")
      }
    }, DEBOUNCE_MS)
  }

  // ---- derived: is the form submittable? ----
  const hasBlockingCheck = usernameStatus === "checking" || phoneStatus === "checking"
  const hasDuplication = usernameStatus === "taken" || phoneStatus === "taken"
  const canSubmit = !submitting && !hasBlockingCheck && !hasDuplication

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError("")
    if (!allowWhatsapp && !allowCall) {
      setValidationError("يرجى تفعيل وسيلة تواصل واحدة على الأقل (واتساب أو مكالمة).")
      return
    }

    await register({
      username,
      phone,
      arabic_full_name: arabicFullName,
      password,
      account_type: accountType,
      allow_whatsapp: allowWhatsapp,
      whatsapp_number: allowWhatsapp ? whatsappNumber || phone : "",
      allow_call: allowCall,
      call_phone: allowCall ? callPhone || phone : "",
      locality_id: localityId ? Number(localityId) : null,
      bio,
    })
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>إنشاء حساب جديد</CardTitle>
            <CardDescription>اختر نوع الحساب (مزارع أو تاجر) وحدد وسائل التواصل المناسبة.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={accountType === "farmer" ? "default" : "outline"}
                  onClick={() => setAccountType("farmer")}
                >
                  حساب مزارع
                </Button>
                <Button
                  type="button"
                  variant={accountType === "trader" ? "default" : "outline"}
                  onClick={() => setAccountType("trader")}
                >
                  حساب تاجر
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="arabic_full_name">
                    {accountType === "farmer" ? "الاسم الكامل" : "اسم التاجر / المحل"}
                  </Label>
                  <Input
                    id="arabic_full_name"
                    required
                    value={arabicFullName}
                    onChange={(event) => setArabicFullName(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    required
                    aria-invalid={usernameStatus === "taken"}
                    className={
                      usernameStatus === "taken"
                        ? "border-destructive focus-visible:ring-destructive"
                        : usernameStatus === "available"
                          ? "border-green-500 focus-visible:ring-green-500"
                          : ""
                    }
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value)
                      checkUsername(event.target.value)
                    }}
                  />
                  <FieldHint status={usernameStatus} takenMessage="اسم المستخدم مستخدم بالفعل." />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone">رقم الجوال الأساسي</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+2499..."
                    required
                    aria-invalid={phoneStatus === "taken"}
                    className={
                      phoneStatus === "taken"
                        ? "border-destructive focus-visible:ring-destructive"
                        : phoneStatus === "available"
                          ? "border-green-500 focus-visible:ring-green-500"
                          : ""
                    }
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value)
                      checkPhone(event.target.value)
                    }}
                  />
                  <FieldHint status={phoneStatus} takenMessage="رقم الجوال مسجّل بالفعل." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>المحلية</Label>
                <Select value={localityId} onValueChange={(value) => setLocalityId(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المحلية (اختياري)">
                      {localities.find((item) => String(item.id) === localityId)?.name_ar}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {localities.map((locality) => (
                      <SelectItem key={locality.id} value={String(locality.id)}>
                        {locality.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">
                  {accountType === "farmer" ? "المحاصيل والنشاط الزراعي" : "السلع والمحاصيل المتوفرة"}
                </Label>
                <Input
                  id="bio"
                  placeholder={
                    accountType === "farmer"
                      ? "مثال: مزارع ذرة وسمسم"
                      : "مثال: بيع الحبوب والجوالات وشراء المحاصيل"
                  }
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </div>

              <div className="border-border space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">وسائل التواصل الظاهرة أمام حسابك</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allowWhatsapp}
                      onChange={(event) => setAllowWhatsapp(event.target.checked)}
                    />
                    <span>تفعيل التواصل عبر واتساب</span>
                  </label>
                  {allowWhatsapp && (
                    <Input
                      type="tel"
                      placeholder="رقم الواتساب (يستخدم الجوال الأساسي إذا تُرك فارغاً)"
                      value={whatsappNumber}
                      onChange={(event) => setWhatsappNumber(event.target.value)}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allowCall}
                      onChange={(event) => setAllowCall(event.target.checked)}
                    />
                    <span>تفعيل التواصل عبر المكالمات</span>
                  </label>
                  {allowCall && (
                    <Input
                      type="tel"
                      placeholder="رقم المكالمات (يستخدم الجوال الأساسي إذا تُرك فارغاً)"
                      value={callPhone}
                      onChange={(event) => setCallPhone(event.target.value)}
                    />
                  )}
                </div>
              </div>

              {(validationError || error) && (
                <p className="text-destructive text-sm" role="alert">
                  {validationError || error}
                </p>
              )}

              <Button className="w-full" type="submit" disabled={!canSubmit}>
                {submitting
                  ? "جار إنشاء الحساب..."
                  : hasBlockingCheck
                    ? "جار التحقق…"
                    : "إنشاء الحساب"}
              </Button>

              <p className="text-muted-foreground text-center text-sm">
                لديك حساب بالفعل؟{" "}
                <Link className="text-primary underline-offset-4 hover:underline" to="/login">
                  تسجيل الدخول
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
