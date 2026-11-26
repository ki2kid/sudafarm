import type { User } from "../auth/auth-context"
import { getCsrfToken } from "./api"

const USER_CACHE_KEY = "sudafarm_user_cache"
const DIRECTORY_CACHE_KEY = "sudafarm_directory_cache"
const LISTINGS_CACHE_KEY = "sudafarm_listings_cache"
const PENDING_LISTINGS_KEY = "sudafarm_pending_listings"

export const SYNC_COMPLETE_EVENT = "sudafarm:sync-complete"

export type PendingListingPayload = {
  listing_type: "sell" | "buy"
  product_category: string
  product_name: string
  price: number
  quantity: number
  unit: string
  description: string
  duration_days: number
}

export type PendingListing = PendingListingPayload & {
  localId: string
  createdAt: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota errors
  }
}

// ── User cache ────────────────────────────────────────────────────────────────

export function getCachedUser(): User | null {
  return readJson<User | null>(USER_CACHE_KEY, null)
}

export function setCachedUser(user: User | null): void {
  if (user) {
    writeJson(USER_CACHE_KEY, user)
  } else {
    try {
      localStorage.removeItem(USER_CACHE_KEY)
    } catch {
      // Ignore
    }
  }
}

// ── Directory cache ───────────────────────────────────────────────────────────

export function getCachedDirectory<T>(key = "all"): T[] {
  const store = readJson<Record<string, T[]>>(DIRECTORY_CACHE_KEY, {})
  return store[key] ?? store.all ?? []
}

export function setCachedDirectory<T>(key: string, items: T[]): void {
  const store = readJson<Record<string, T[]>>(DIRECTORY_CACHE_KEY, {})
  store[key] = items
  writeJson(DIRECTORY_CACHE_KEY, store)
}

// ── Listings cache ────────────────────────────────────────────────────────────

export function getCachedListings<T>(key = "all"): T[] {
  const store = readJson<Record<string, T[]>>(LISTINGS_CACHE_KEY, {})
  return store[key] ?? store.all ?? []
}

export function setCachedListings<T>(key: string, items: T[]): void {
  const store = readJson<Record<string, T[]>>(LISTINGS_CACHE_KEY, {})
  store[key] = items
  writeJson(LISTINGS_CACHE_KEY, store)
}

// ── Pending listings outbox ───────────────────────────────────────────────────

export function getPendingListings(): PendingListing[] {
  return readJson<PendingListing[]>(PENDING_LISTINGS_KEY, [])
}

export function addPendingListing(payload: PendingListingPayload): PendingListing {
  const item: PendingListing = {
    ...payload,
    localId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  }
  const existing = getPendingListings()
  writeJson(PENDING_LISTINGS_KEY, [item, ...existing])
  return item
}

export function removePendingListing(localId: string): void {
  const existing = getPendingListings()
  writeJson(
    PENDING_LISTINGS_KEY,
    existing.filter((item) => item.localId !== localId),
  )
}

let syncInFlight = false

/** Attempts to publish all queued offline listings to the API. */
export async function syncPendingListings(): Promise<{ synced: number; remaining: number }> {
  if (syncInFlight) {
    return { synced: 0, remaining: getPendingListings().length }
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: getPendingListings().length }
  }

  const queue = getPendingListings()
  if (queue.length === 0) {
    return { synced: 0, remaining: 0 }
  }

  syncInFlight = true
  let synced = 0

  try {
    const csrf = await getCsrfToken()
    // Sync oldest first so order is preserved
    const ordered = [...queue].reverse()
    for (const item of ordered) {
      const payload: PendingListingPayload = {
        listing_type: item.listing_type,
        product_category: item.product_category,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
        description: item.description,
        duration_days: item.duration_days,
      }
      const response = await fetch("/api/listings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        removePendingListing(item.localId)
        synced += 1
      } else if (response.status >= 400 && response.status < 500) {
        // Client/validation error: drop invalid item to avoid infinite retry loop
        removePendingListing(item.localId)
      } else {
        // Server error: stop and retry later
        break
      }
    }
  } catch {
    // Network error: keep remaining items in queue for next online event
  } finally {
    syncInFlight = false
  }

  if (synced > 0) {
    window.dispatchEvent(new CustomEvent(SYNC_COMPLETE_EVENT, { detail: { synced } }))
  }

  return { synced, remaining: getPendingListings().length }
}

/** Clears all offline user/API caches on logout. */
export function clearAllOfflineCaches(): void {
  try {
    localStorage.removeItem(USER_CACHE_KEY)
    localStorage.removeItem(DIRECTORY_CACHE_KEY)
    localStorage.removeItem(LISTINGS_CACHE_KEY)
    localStorage.removeItem(PENDING_LISTINGS_KEY)
  } catch {
    // Ignore
  }
}
