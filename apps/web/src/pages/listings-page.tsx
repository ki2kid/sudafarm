import { useEffect, useState } from "react"
import { Link } from "react-router"
import { MessageCircle, Phone, Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"
import { getCsrfToken } from "../lib/api"
import { CATEGORY_LABELS, UNIT_LABELS } from "./create-listing-page"

// ── Types ─────────────────────────────────────────────────────────────────────

type ListingType = "sell" | "buy"
type ProductCategory = keyof typeof CATEGORY_LABELS
type Unit = keyof typeof UNIT_LABELS

type Listing = {
  id: number
  listing_type: ListingType
  product_category: ProductCategory
  product_name: string
  price: string
  quantity: string
  unit: Unit
  description: string
  created_at: string
  expires_at: string
  is_active: boolean
  author_id: number
  author_name: string
  author_account_type: "farmer" | "trader"
  author_locality_name_ar: string | null
  author_state_name_ar: string | null
  author_allow_whatsapp: boolean
  author_whatsapp_number: string
  author_allow_call: boolean
  author_call_phone: string
}

type Filter = "all" | "sell" | "buy" | "mine"

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)
  if (hours < 1) return "منذ أقل من ساعة"
  if (hours < 24) return `منذ ${hours} ${hours === 1 ? "ساعة" : "ساعات"}`
  if (days === 1) return "منذ يوم"
  return `منذ ${days} أيام`
}

function daysLeft(iso: string): { text: string; urgent: boolean } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return { text: "منتهي", urgent: true }
  if (days === 1) return { text: "ينتهي غداً", urgent: true }
  if (days <= 3) return { text: `ينتهي خلال ${days} أيام`, urgent: true }
  return { text: `ينتهي خلال ${days} يوماً`, urgent: false }
}

function formatPhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "")
}

function waUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`
}

function formatPrice(price: string, unit: Unit): string {
  return `${Number(price).toLocaleString("ar-EG")} جنيه / ${UNIT_LABELS[unit] ?? unit}`
}

// ── Listing card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  currentUserId,
  onDelete,
}: {
  listing: Listing
  currentUserId: number | undefined
  onDelete: (id: number) => void
}) {
  const isOwner = listing.author_id === currentUserId
  const expiry = daysLeft(listing.expires_at)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  listing.listing_type === "sell"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                }`}
              >
                {listing.listing_type === "sell" ? "بيع" : "شراء"}
              </span>
              <span className="text-muted-foreground text-xs shrink-0">
                {CATEGORY_LABELS[listing.product_category] ?? listing.product_category}
              </span>
            </div>
            <CardTitle className="text-base leading-tight">{listing.product_name}</CardTitle>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete(listing.id)}
              title="حذف الإعلان"
              className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 transition-colors"
              aria-label="حذف الإعلان"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price + quantity */}
        <p className="text-sm font-medium">
          {formatPrice(listing.price, listing.unit)}
          <span className="text-muted-foreground font-normal">
            {" · الكمية: "}
            {Number(listing.quantity).toLocaleString("ar-EG")} {UNIT_LABELS[listing.unit] ?? listing.unit}
          </span>
        </p>

        {listing.description && (
          <p className="text-muted-foreground text-xs leading-relaxed">{listing.description}</p>
        )}

        {/* Author */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {listing.author_name}
            {" · "}
            {listing.author_account_type === "farmer" ? "مزارع" : "تاجر"}
            {listing.author_state_name_ar && listing.author_locality_name_ar
              ? ` · ${listing.author_state_name_ar} - ${listing.author_locality_name_ar}`
              : ""}
          </span>
          <span>{timeAgo(listing.created_at)}</span>
        </div>

        {/* Expiry badge */}
        <p className={`text-xs font-medium ${expiry.urgent ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
          {expiry.text}
        </p>

        {/* Contact buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {listing.author_allow_whatsapp && listing.author_whatsapp_number && (
            <a
              href={waUrl(listing.author_whatsapp_number)}
              target="_blank"
              rel="noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              <span>واتساب</span>
              <span className="opacity-80">{formatPhone(listing.author_whatsapp_number)}</span>
            </a>
          )}
          {listing.author_allow_call && listing.author_call_phone && (
            <a
              href={`tel:${listing.author_call_phone}`}
              className="border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              <span>اتصال</span>
              <span className="text-muted-foreground">{formatPhone(listing.author_call_phone)}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTER_TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "sell", label: "بيع" },
  { value: "buy", label: "شراء" },
  { value: "mine", label: "إعلاناتي" },
]

const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "كل المنتجات" },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
]

export function ListingsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setLoading(true)
    setError("")
    const params = new URLSearchParams()
    if (filter === "sell") params.set("listing_type", "sell")
    else if (filter === "buy") params.set("listing_type", "buy")
    else if (filter === "mine") params.set("my_listings", "true")
    if (categoryFilter !== "all") params.set("product_category", categoryFilter)

    fetch(`/api/listings?${params.toString()}`, { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error("تعذر تحميل الإعلانات.")
        setListings((await res.json()) as Listing[])
      })
      .catch((err) => setError(err instanceof Error ? err.message : "تعذر تحميل الإعلانات."))
      .finally(() => setLoading(false))
  }, [filter, categoryFilter])

  async function handleDelete(id: number) {
    if (!window.confirm("هل أنت متأكد من حذف هذا الإعلان؟")) return
    try {
      const csrf = await getCsrfToken()
      const res = await fetch(`/api/listings/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRFToken": csrf },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        throw new Error(body.detail ?? "تعذر حذف الإعلان.")
      }
      setListings((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر حذف الإعلان.")
    }
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">الإعلانات</h1>
            <p className="text-muted-foreground text-sm">عروض البيع والشراء من المزارعين والتجار.</p>
          </div>
          <Button asChild>
            <Link to="/listings/create">نشر إعلان جديد</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategoryFilter(opt.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === opt.value
                    ? "bg-secondary text-secondary-foreground border-secondary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading && (
          <p className="text-muted-foreground text-sm" role="status">جار تحميل الإعلانات…</p>
        )}
        {error && (
          <p className="text-destructive text-sm" role="alert">{error}</p>
        )}

        {!loading && !error && listings.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground">لا توجد إعلانات مطابقة.</p>
              <Button asChild variant="outline">
                <Link to="/listings/create">كن أول من ينشر إعلاناً</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              currentUserId={user?.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
