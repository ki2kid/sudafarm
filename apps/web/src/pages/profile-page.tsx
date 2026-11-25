import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router"
import { ChevronRight } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"
import { toast } from "../components/toaster"

type Locality = { id: number; state_id: number; name_ar: string; name_en: string }

export function ProfilePage() {
  const { user, updateProfile, submitting } = useAuth()

  const [arabicFullName, setArabicFullName] = useState(user?.arabic_full_name ?? "")
  const [allowWhatsapp, setAllowWhatsapp] = useState(user?.allow_whatsapp ?? true)
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsapp_number ?? "")
  const [allowCall, setAllowCall] = useState(user?.allow_call ?? true)
  const [callPhone, setCallPhone] = useState(user?.call_phone ?? "")
  const [localityId, setLocalityId] = useState(user?.locality_id ? String(user.locality_id) : "")
  const [bio, setBio] = useState(user?.bio ?? "")
  const [localities, setLocalities] = useState<Locality[]>([])
  const [validationError, setValidationError] = useState("")

  useEffect(() => {
    fetch("/api/locations/localities", { credentials: "same-origin" })
      .then(async (res) => {
        if (res.ok) setLocalities((await res.json()) as Locality[])
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError("")

    if (!arabicFullName.trim()) {
      const msg = "يرجى إدخال الاسم الكامل."
      setValidationError(msg)
      toast.error(msg)
      return
    }
    if (!allowWhatsapp && !allowCall) {
      const msg = "يرجى تفعيل وسيلة تواصل واحدة على الأقل (واتساب أو مكالمة)."
      setValidationError(msg)
      toast.error(msg)
      return
    }

    await updateProfile({
      arabic_full_name: arabicFullName.trim(),
      allow_whatsapp: allowWhatsapp,
      whatsapp_number: allowWhatsapp ? whatsappNumber.trim() : "",
      allow_call: allowCall,
      call_phone: allowCall ? callPhone.trim() : "",
      locality_id: localityId ? Number(localityId) : null,
      bio: bio.trim(),
    })
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-2xl space-y-6 p-6">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">لوحة التحكم</Link>
          <ChevronRight className="size-4 rotate-180" aria-hidden="true" />
          <span className="text-foreground">الملف الشخصي</span>
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>تعديل الملف الشخصي</CardTitle>
            <CardDescription>
              حدّث اسمك وبيانات التواصل (واتساب والمكالمات) وموقعك.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="arabic_full_name">الاسم الكامل</Label>
                <Input
                  id="arabic_full_name"
                  value={arabicFullName}
                  onChange={(e) => setArabicFullName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input id="username" value={user?.username ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال الأساسي</Label>
                  <Input id="phone" value={user?.phone ?? ""} dir="ltr" disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locality_id">المحلية</Label>
                <Select
                  value={localityId}
                  onValueChange={(value) => setLocalityId(value ?? "")}
                >
                  <SelectTrigger id="locality_id">
                    <SelectValue placeholder="اختر المحلية">
                      {localities.find((l) => String(l.id) === localityId)?.name_ar}
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

              <div className="border-border space-y-4 rounded-lg border p-4">
                <p className="text-sm font-medium">طرق التواصل</p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={allowWhatsapp}
                      onChange={(e) => setAllowWhatsapp(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <span>تفعيل التواصل عبر واتساب</span>
                  </label>
                  {allowWhatsapp && (
                    <div className="space-y-1.5 ps-6">
                      <Label htmlFor="whatsapp_number" className="text-xs">رقم الواتساب</Label>
                      <Input
                        id="whatsapp_number"
                        dir="ltr"
                        placeholder="+249..."
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={allowCall}
                      onChange={(e) => setAllowCall(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <span>تفعيل المكالمات الهاتفية</span>
                  </label>
                  {allowCall && (
                    <div className="space-y-1.5 ps-6">
                      <Label htmlFor="call_phone" className="text-xs">رقم المكالمات</Label>
                      <Input
                        id="call_phone"
                        dir="ltr"
                        placeholder="+249..."
                        value={callPhone}
                        onChange={(e) => setCallPhone(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">نبذة تعريفية</Label>
                <textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن نشاطك الزراعي أو التجاري..."
                  className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
                />
              </div>

              {validationError && (
                <p className="text-destructive text-sm" role="alert">{validationError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <Link
                  to="/dashboard"
                  className="border-border bg-background hover:bg-muted inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium transition-colors"
                >
                  إلغاء
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "جار الحفظ…" : "حفظ التغييرات"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
