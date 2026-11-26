import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router"
import { ArrowDownUp, MessageCircle, Pencil, Phone, RotateCcw, SlidersHorizontal, Trash2, X } from "lucide-react"
import { toast } from "../components/toaster"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

import { useAuth } from "../auth/auth-context"
import { Navbar } from "../components/navbar"
import { getCsrfToken } from "../lib/api"
import {
  SYNC_COMPLETE_EVENT,
  getCachedListings,
  getPendingListings,
  removePendingListing,
  setCachedListings,
  type PendingListing,
} from "../lib/offline-store"
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
type AuthorTypeFilter = "all" | "farmer" | "trader"
type SortOption = "newest" | "oldest" | "price_asc" | "price_desc"

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
  now,
  onEdit,
  onDelete,
  onRenew,
  renewing,
}: {
  listing: Listing
  currentUserId: number | undefined
  now: number
  onEdit: (listing: Listing) => void
  onDelete: (id: number) => void
  onRenew: (id: number) => void
  renewing: boolean
}) {
  const isOwner = listing.author_id === currentUserId
  const isInactive = !listing.is_active || new Date(listing.expires_at).getTime() <= now

  return (
    <Card className={isInactive ? "opacity-80" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${listing.listing_type === "sell"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                  }`}
              >
                {listing.listing_type === "sell" ? "بيع" : "شراء"}
              </span>
              <span className="text-muted-foreground text-xs shrink-0">
                {CATEGORY_LABELS[listing.product_category] ?? listing.product_category}
              </span>
              {isOwner && isInactive && (
                <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  غير نشط
                </span>
              )}
            </div>
            <CardTitle className="text-base leading-tight">{listing.product_name}</CardTitle>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(listing)}
                title="تعديل الإعلان"
                className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                aria-label="تعديل الإعلان"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(listing.id)}
                title="حذف الإعلان"
                className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                aria-label="حذف الإعلان"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
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

        {/* Contact & owner actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {isOwner && isInactive && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={renewing}
              onClick={() => onRenew(listing.id)}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>{renewing ? "جار التجديد…" : "تجديد الإعلان"}</span>
            </Button>
          )}
          {listing.author_allow_whatsapp && listing.author_whatsapp_number && (
            <a
              href={waUrl(listing.author_whatsapp_number)}
              target="_blank"
              rel="noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              <span>واتساب</span>
            </a>
          )}
          {listing.author_allow_call && listing.author_call_phone && (
            <a
              href={`tel:${listing.author_call_phone}`}
              className="border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              <span>اتصال</span>
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

const AUTHOR_TYPE_TABS: { value: AuthorTypeFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "farmer", label: "المزارعون" },
  { value: "trader", label: "التجار" },
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "oldest", label: "الأقدم" },
  { value: "price_asc", label: "السعر: من الأقل" },
  { value: "price_desc", label: "السعر: من الأعلى" },
]

const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "كل المنتجات" },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
]

function FiltersContent({
  filter,
  onFilterChange,
  authorTypeFilter,
  onAuthorTypeChange,
  categoryFilter,
  onCategoryChange,
  sortOption,
  onSortChange,
}: {
  filter: Filter
  onFilterChange: (value: Filter) => void
  authorTypeFilter: AuthorTypeFilter
  onAuthorTypeChange: (value: AuthorTypeFilter) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  sortOption: SortOption
  onSortChange: (value: SortOption) => void
}) {
  return (
    <div className="space-y-5">
      {/* Author account type filter */}
      {filter !== "mine" && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">إعلانات</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {AUTHOR_TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onAuthorTypeChange(tab.value)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${authorTypeFilter === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type tabs */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">نوع الإعلان</h3>
        <div className="grid grid-cols-2 gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onFilterChange(tab.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${filter === tab.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort options */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ArrowDownUp className="size-3.5" aria-hidden="true" />
          <span>الترتيب</span>
        </h3>
        <div className="flex flex-col gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSortChange(opt.value)}
              className={`w-full rounded-lg border px-3 py-1.5 text-start text-xs font-medium transition-colors ${sortOption === opt.value
                  ? "bg-primary/10 text-primary border-primary/40 font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">الفئة</h3>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCategoryChange(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${categoryFilter === opt.value
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ListingsPage() {
  const { user } = useAuth()
  const defaultAuthorTypeFilter: AuthorTypeFilter =
    user?.account_type === "farmer"
      ? "trader"
      : user?.account_type === "trader"
        ? "farmer"
        : "all"

  const [filter, setFilter] = useState<Filter>("all")
  const [authorTypeFilter, setAuthorTypeFilter] = useState<AuthorTypeFilter>(defaultAuthorTypeFilter)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [renewingId, setRenewingId] = useState<number | null>(null)
  const [editTarget, setEditTarget] = useState<Listing | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editType, setEditType] = useState<ListingType>("sell")
  const [editCategory, setEditCategory] = useState("")
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editQuantity, setEditQuantity] = useState("")
  const [editUnit, setEditUnit] = useState<Unit>("kg")
  const [editDescription, setEditDescription] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const activeFilterCount =
    (filter !== "all" ? 1 : 0) +
    (filter !== "mine" && authorTypeFilter !== defaultAuthorTypeFilter ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (sortOption !== "newest" ? 1 : 0)

  function resetFilters() {
    setFilter("all")
    setAuthorTypeFilter(defaultAuthorTypeFilter)
    setCategoryFilter("all")
    setSortOption("newest")
    toast("تمت إعادة تعيين الفلاتر.")
  }

  useEffect(() => {
    if (!mobileFiltersOpen && !deleteTarget && !editTarget) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editTarget && !savingEdit) setEditTarget(null)
        else if (deleteTarget && !deleting) setDeleteTarget(null)
        else if (mobileFiltersOpen) setMobileFiltersOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileFiltersOpen, deleteTarget, deleting, editTarget, savingEdit])

  const [pendingListings, setPendingListings] = useState<PendingListing[]>(() => getPendingListings())

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter === "sell") params.set("listing_type", "sell")
    else if (filter === "buy") params.set("listing_type", "buy")
    else if (filter === "mine") params.set("my_listings", "true")
    if (filter !== "mine" && authorTypeFilter !== "all") {
      params.set("author_account_type", authorTypeFilter)
    }
    if (categoryFilter !== "all") params.set("product_category", categoryFilter)

    const cacheKey = params.toString() || "all"
    const cachedExact = getCachedListings<Listing>(cacheKey)
    const cachedAll = getCachedListings<Listing>("all")
    const initialCached =
      cachedExact.length > 0
        ? cachedExact
        : cachedAll.filter((item) => {
            if (filter === "sell" && item.listing_type !== "sell") return false
            if (filter === "buy" && item.listing_type !== "buy") return false
            if (filter === "mine" && item.author_id !== user?.id) return false
            if (filter !== "mine" && authorTypeFilter !== "all" && item.author_account_type !== authorTypeFilter)
              return false
            if (categoryFilter !== "all" && item.product_category !== categoryFilter) return false
            return true
          })

    async function load() {
      if (initialCached.length === 0) {
        setLoading(true)
      }
      setError("")
      try {
        const res = await fetch(`/api/listings?${params.toString()}`, { credentials: "same-origin" })
        if (!res.ok) throw new Error("تعذر تحميل الإعلانات.")
        setNow(Date.now())
        const data = (await res.json()) as Listing[]
        setListings(data)
        setCachedListings(cacheKey, data)

        if (cacheKey !== "all" && getCachedListings<Listing>("all").length === 0) {
          fetch("/api/listings", { credentials: "same-origin" })
            .then((r) => (r.ok ? (r.json() as Promise<Listing[]>) : null))
            .then((allData) => {
              if (allData) setCachedListings("all", allData)
            })
            .catch(() => undefined)
        }
      } catch (err) {
        if (initialCached.length > 0) {
          setListings(initialCached)
        } else {
          setError(err instanceof Error ? err.message : "تعذر تحميل الإعلانات.")
        }
      } finally {
        setLoading(false)
      }
    }
    void load()

    function handleSyncComplete() {
      setPendingListings(getPendingListings())
      void load()
    }

    window.addEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete)
    return () => window.removeEventListener(SYNC_COMPLETE_EVENT, handleSyncComplete)
  }, [filter, authorTypeFilter, categoryFilter, user?.id])

  const visiblePendingListings = useMemo(() => {
    return pendingListings.filter((item) => {
      if (filter === "sell" && item.listing_type !== "sell") return false
      if (filter === "buy" && item.listing_type !== "buy") return false
      if (categoryFilter !== "all" && item.product_category !== categoryFilter) return false
      return true
    })
  }, [pendingListings, filter, categoryFilter])

  function handleDiscardPending(localId: string) {
    removePendingListing(localId)
    setPendingListings(getPendingListings())
    toast.success("تم حذف الإعلان المحفوظ محلياً.")
  }

  const sortedListings = useMemo(() => {
    const copy = [...listings]
    if (sortOption === "newest") {
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortOption === "oldest") {
      copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortOption === "price_asc") {
      copy.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortOption === "price_desc") {
      copy.sort((a, b) => Number(b.price) - Number(a.price))
    }
    return copy
  }, [listings, sortOption])

  function openEditModal(listing: Listing) {
    setEditTarget(listing)
    setEditType(listing.listing_type)
    setEditCategory(String(listing.product_category))
    setEditName(listing.product_name)
    setEditPrice(String(listing.price))
    setEditQuantity(String(listing.quantity))
    setEditUnit(listing.unit)
    setEditDescription(listing.description)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editTarget) return
    if (!editName.trim()) {
      toast.error("يرجى إدخال اسم المنتج.")
      return
    }
    if (Number(editPrice) <= 0) {
      toast.error("يرجى إدخال سعر صحيح.")
      return
    }
    if (Number(editQuantity) <= 0) {
      toast.error("يرجى إدخال كمية صحيحة.")
      return
    }

    setSavingEdit(true)
    try {
      const csrf = await getCsrfToken()
      const res = await fetch(`/api/listings/${editTarget.id}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({
          listing_type: editType,
          product_category: editCategory,
          product_name: editName.trim(),
          price: Number(editPrice),
          quantity: Number(editQuantity),
          unit: editUnit,
          description: editDescription.trim(),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        throw new Error(body.detail ?? "تعذر تحديث الإعلان.")
      }
      const updated = (await res.json()) as Listing
      setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      setEditTarget(null)
      toast.success("تم تحديث الإعلان بنجاح.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تحديث الإعلان.")
    } finally {
      setSavingEdit(false)
    }
  }

  function requestDelete(id: number) {
    const target = listings.find((l) => l.id === id) ?? null
    setDeleteTarget(target)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setDeleting(true)
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
      setDeleteTarget(null)
      toast.success("تم حذف الإعلان.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر حذف الإعلان.")
    } finally {
      setDeleting(false)
    }
  }

  async function handleRenew(id: number) {
    setRenewingId(id)
    try {
      const csrf = await getCsrfToken()
      const res = await fetch(`/api/listings/${id}/renew`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string }
        throw new Error(body.detail ?? "تعذر تجديد الإعلان.")
      }
      const updated = (await res.json()) as Listing
      setNow(Date.now())
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)))
      toast.success("تم تجديد الإعلان بنجاح.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تجديد الإعلان.")
    } finally {
      setRenewingId(null)
    }
  }

  return (
    <div className="bg-muted/30 min-h-svh" dir="rtl">
      <Navbar />
      <main id="main-content" className="mx-auto max-w-6xl space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">الإعلانات</h1>
            <p className="text-muted-foreground text-sm">عروض البيع والشراء من المزارعين والتجار.</p>
          </div>
          <Link to="/listings/create" className={buttonVariants()}>نشر إعلان جديد</Link>
        </div>

        {/* Mobile filter toolbar */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span>تصفية وترتيب</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>إعادة تعيين</span>
              </Button>
            )}
          </div>
          {!loading && !error && (
            <span className="text-muted-foreground text-xs">
              {sortedListings.length} إعلان
            </span>
          )}
        </div>

        {/* Layout: Sidebar (desktop) + Listings grid */}
        <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block sticky top-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>تصفية وترتيب</span>
                  </CardTitle>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
                    >
                      <RotateCcw className="size-3" aria-hidden="true" />
                      <span>إعادة تعيين</span>
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <FiltersContent
                  filter={filter}
                  onFilterChange={setFilter}
                  authorTypeFilter={authorTypeFilter}
                  onAuthorTypeChange={setAuthorTypeFilter}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                />
              </CardContent>
            </Card>
          </aside>

          {/* Content */}
          <section className="min-w-0 space-y-4">
            {loading && (
              <p className="text-muted-foreground text-sm" role="status">جار تحميل الإعلانات…</p>
            )}
            {error && (
              <p className="text-destructive text-sm" role="alert">{error}</p>
            )}

            {!loading && !error && listings.length === 0 && visiblePendingListings.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <p className="text-muted-foreground">لا توجد إعلانات مطابقة.</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {activeFilterCount > 0 && (
                      <Button type="button" variant="outline" onClick={resetFilters}>
                        إعادة تعيين الفلاتر
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {visiblePendingListings.map((pending) => (
                <Card key={pending.localId} className="border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              pending.listing_type === "sell"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}
                          >
                            {pending.listing_type === "sell" ? "بيع" : "شراء"}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0">
                            {CATEGORY_LABELS[pending.product_category] ?? pending.product_category}
                          </span>
                          <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                            في انتظار الإنترنت
                          </span>
                        </div>
                        <CardTitle className="text-base leading-tight">{pending.product_name}</CardTitle>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDiscardPending(pending.localId)}
                        className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
                        title="إلغاء النشر"
                        aria-label="إلغاء النشر"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="font-semibold text-primary">
                      {formatPrice(String(pending.price), pending.unit as Unit)}
                    </div>
                    <div className="text-muted-foreground">
                      الكمية: {Number(pending.quantity).toLocaleString("ar-EG")}{" "}
                      {UNIT_LABELS[pending.unit as Unit] ?? pending.unit}
                    </div>
                    {pending.description && <p className="text-muted-foreground">{pending.description}</p>}
                  </CardContent>
                </Card>
              ))}
              {sortedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  currentUserId={user?.id}
                  now={now}
                  onEdit={openEditModal}
                  onDelete={requestDelete}
                  onRenew={handleRenew}
                  renewing={renewingId === listing.id}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Mobile Floating Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="تصفية وترتيب الإعلانات"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="bg-background border-e relative z-10 flex h-full w-full max-w-xs flex-col shadow-xl">
            <div className="border-border flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
                <span>تصفية وترتيب</span>
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="إغلاق"
                className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <FiltersContent
                filter={filter}
                onFilterChange={setFilter}
                authorTypeFilter={authorTypeFilter}
                onAuthorTypeChange={setAuthorTypeFilter}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                sortOption={sortOption}
                onSortChange={setSortOption}
              />
            </div>

            <div className="border-border flex items-center gap-2 border-t p-4">
              <Button
                type="button"
                className="flex-1"
                onClick={() => setMobileFiltersOpen(false)}
              >
                عرض النتائج ({sortedListings.length})
              </Button>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                >
                  إعادة تعيين
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Dialog */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dialog-title"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => {
              if (!savingEdit) setEditTarget(null)
            }}
          />
          <Card className="relative z-10 max-h-[90svh] w-full max-w-lg overflow-y-auto shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle id="edit-dialog-title" className="text-base">
                تعديل الإعلان
              </CardTitle>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setEditTarget(null)}
                aria-label="إغلاق"
                className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleEditSubmit}>
                <div className="space-y-2">
                  <Label>نوع الإعلان</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={editType === "sell" ? "default" : "outline"}
                      onClick={() => setEditType("sell")}
                    >
                      عرض بيع
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={editType === "buy" ? "default" : "outline"}
                      onClick={() => setEditType("buy")}
                    >
                      طلب شراء
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">الفئة</Label>
                    <Select
                      value={editCategory}
                      onValueChange={(value) => {
                        if (value) setEditCategory(value)
                      }}
                    >
                      <SelectTrigger id="edit-category">
                        <SelectValue>
                          {CATEGORY_LABELS[editCategory] ?? editCategory}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-name">اسم المنتج</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">السعر (جنيه)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="1"
                      step="any"
                      dir="ltr"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-quantity">الكمية</Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      min="0.01"
                      step="any"
                      dir="ltr"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-unit">الوحدة</Label>
                    <Select
                      value={editUnit}
                      onValueChange={(value) => {
                        if (value) setEditUnit(value as Unit)
                      }}
                    >
                      <SelectTrigger id="edit-unit">
                        <SelectValue>
                          {UNIT_LABELS[editUnit] ?? editUnit}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(UNIT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">الوصف</Label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={savingEdit}
                    onClick={() => setEditTarget(null)}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit ? "جار الحفظ…" : "حفظ التعديلات"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => {
              if (!deleting) setDeleteTarget(null)
            }}
          />
          <Card className="relative z-10 w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle id="delete-dialog-title" className="text-base">
                تأكيد حذف الإعلان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                هل أنت متأكد من حذف إعلان{" "}
                <span className="text-foreground font-medium">«{deleteTarget.product_name}»</span>؟
                لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleting}
                  onClick={confirmDelete}
                >
                  {deleting ? "جار الحذف…" : "حذف"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
