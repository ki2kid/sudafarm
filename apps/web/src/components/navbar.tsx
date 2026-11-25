import { LayoutList, LogOut, Moon, Plus, Sun } from "lucide-react"
import { Link } from "react-router"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { useAuth } from "../auth/auth-context"
import { useTheme } from "./theme-provider"

export function Navbar() {
  const { user, logout, submitting } = useAuth()
  const { setTheme, theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && document.documentElement.classList.contains("dark"))

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <a
        className="focus:bg-background focus:text-foreground absolute start-2 top-2 -translate-y-20 rounded-md px-3 py-2 text-sm focus:translate-y-0"
        href="#main-content"
      >
        تخطي إلى المحتوى
      </a>

      <nav
        className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6"
        aria-label="التنقل الرئيسي"
      >
        {/* ── Start: brand + nav links ─────────────────────────── */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link className="text-lg font-semibold shrink-0" to="/dashboard">
            سودافارم
          </Link>

          {user && (
            <>
              <Link
                className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-sm sm:flex"
                to="/listings"
              >
                <LayoutList className="size-4" aria-hidden="true" />
                الإعلانات
              </Link>

              {user.is_superuser && (
                <Link
                  className="text-muted-foreground hover:text-foreground hidden text-sm sm:block"
                  to="/locations"
                >
                  المواقع
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── End: actions ─────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user && (
            <>
              {/* Post-ad button — icon only on mobile, icon+text on sm+ */}
              <Link
                to="/listings/create"
                className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">إعلان جديد</span>
              </Link>

              {/* Listings icon link on mobile (hidden on sm where it's in nav) */}
              <Link
                to="/listings"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "sm:hidden")}
                title="الإعلانات"
                aria-label="الإعلانات"
              >
                <LayoutList className="size-4" aria-hidden="true" />
              </Link>

              {/* Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                disabled={submitting}
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </>
          )}

          {/* Theme toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
            title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </Button>
        </div>
      </nav>
    </header>
  )
}
