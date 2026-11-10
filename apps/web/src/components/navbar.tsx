import { Moon, Sun } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { useTheme } from "./theme-provider"

export function Navbar() {
  const { setTheme, theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"))

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
      <nav className="mx-auto flex h-16 w-full items-center justify-between px-6" aria-label="التنقل الرئيسي">
        <span className="text-lg font-semibold">إسناد</span>
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
