import { Moon, Sun } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Link } from "react-router"

import { useAuth } from "../auth/auth-context"
import { useTheme } from "./theme-provider"

export function Navbar() {
  const { user } = useAuth()
  const { setTheme, theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"))

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <a className="focus:bg-background focus:text-foreground absolute start-2 top-2 -translate-y-20 rounded-md px-3 py-2 text-sm focus:translate-y-0" href="#main-content">
        تخطي إلى المحتوى
      </a>
      <nav className="mx-auto flex h-16 w-full items-center justify-between px-6" aria-label="التنقل الرئيسي">
        <div className="flex items-center gap-6">
          <Link className="text-lg font-semibold" to="/dashboard">إسناد</Link>
          {user?.is_superuser && (
            <Link className="text-muted-foreground hover:text-foreground text-sm" to="/locations">
              المواقع والمنشآت
            </Link>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </nav>
    </header>
  )
}
