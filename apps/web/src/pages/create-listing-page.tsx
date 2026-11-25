import { useState } from "react"
import { useNavigate } from "react-router"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

import { Navbar } from "../components/navbar"
import { getCsrfToken } from "../lib/api"

// ── Arabic label maps ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  sesame: "سمسم",
  sorghum: "ذرة",
  groundnut: "فول سوداني",
  wheat: "قمح",
  millet: "دخن",
  cotton: "قطن",
  gum_arabic: "صمغ عربي",
  sacks: "جوالات",
  fertilizer: "أسمدة",
  seeds: "تقاوي",
  pesticide: "مبيدات",
  other: "أخرى",
}

export const UNIT_LABELS: Record<string, string> = {
  kg: "كيلوغرام",
  ton: "طن",
  sack: "جوال",
  piece: "قطعة",
  liter: "لتر",
}

const DURATION_OPTIONS = [
  { value: 7, label: "٧ أيام" },
  { value: 14, label: "١٤ يوماً" },
  { value: 30, label: "٣٠ يوماً (افتراضي)" },
  { value: 60, label: "٦٠ يوماً" },
  { value: 90, label: "٩٠ يوماً" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateListingPage() {
  const navigate = useNavigate()

  const [listingType, setListingType] = useState<"sell" | "buy">("sell")
  const [productCategory, setProductCategory] = useState("")
  const [productName, setProductName] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("kg")
  const [description, setDescription] = useState("")
  const [durationDays, setDurationDays] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleCategoryChange(value: string) {
    setProductCategory(value)
    if (!productName || Object.values(CATEGORY_LABELS).includes(productName)) {
      setProductName(CATEGORY_LABELS[value] ?? "")
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")

    if (!productCategory) { setError("يرجى اختيار نوع المنتج."); return }
    if (!productName.trim()) { setError("يرجى إدخال اسم المنتج."); return }
    if (Number(price) <= 0) { setError("يرجى إدخال سعر صحيح."); return }
    if (Number(quantity) <= 0) { setError("يرجى إدخال كمية صحيحة."); return }

    setSubmitting(true)
    try {
      const csrf = await getCsrfToken()
      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({
          listing_type: listingType,
          product_category: productCategory,
          product_name: productName.trim(),
          price: Number(price),
          quantity: Number(quantity),
          unit,
          description: description.trim(),
          duration_days: durationDays,
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: string }
        throw new Error(body.detail ?? "تعذر نشر الإعلان.")
      }
      navigate("/listings")
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر نشر الإعلان.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/listings" className="hover:text-foreground">الإعلانات</Link>
          <ChevronRight className="size-4 rotate-180" aria-hidden="true" />
          <span className="text-foreground">إعلان جديد</span>
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>نشر إعلان جديد</CardTitle>
            <CardDescription>حدد نوع العرض ومعلومات المنتج وسيظهر إعلانك للمزارعين والتجار.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Listing type */}
              <div className="space-y-2">
                <Label>نوع الإعلان</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={listingType === "sell" ? "default" : "outline"}
                    onClick={() => setListingType("sell")}
                  >
                    عرض بيع
                  </Button>
                  <Button
                    type="button"
                    variant={listingType === "buy" ? "default" : "outline"}
                    onClick={() => setListingType("buy")}
                  >
                    طلب شراء
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  {listingType === "sell"
                    ? "أنت تعرض منتجاً للبيع — سيتواصل معك المشترون."
                    : "أنت تبحث عن منتج لشرائه — سيتواصل معك البائعون."}
                </p>
              </div>

              {/* Category + product name */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نوع المنتج / المحصول</Label>
                  <Select value={productCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_name">اسم المنتج (يمكن تخصيصه)</Label>
                  <Input
                    id="product_name"
                    placeholder="مثال: سمسم بلدي، ذرة صيفية"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Price + quantity + unit */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">السعر (جنيه)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="٠.٠٠"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="٠"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوحدة</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v ?? "kg")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="معلومات إضافية عن الجودة والمواصفات وطريقة التسليم..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>مدة الإعلان</Label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDurationDays(opt.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        durationDays === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-destructive text-sm" role="alert">{error}</p>}

              <div className="flex gap-3">
                <Button className="flex-1" type="submit" disabled={submitting}>
                  {submitting ? "جار النشر..." : "نشر الإعلان"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
