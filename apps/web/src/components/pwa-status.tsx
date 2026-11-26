import { useEffect, useRef, useState } from "react"
import { WifiOff } from "lucide-react"
import { useRegisterSW } from "virtual:pwa-register/react"

import { toast } from "./toaster"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/** Tracks browser installability via `beforeinstallprompt`. */
export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") {
      setInstallPrompt(null)
    }
  }

  return { canInstall: installPrompt !== null, promptInstall }
}

/** Registers the service worker and displays an offline indicator banner. */
export function PwaStatus() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  )
  const wasOfflineRef = useRef(isOffline)

  useRegisterSW({
    onOfflineReady() {
      toast.success("التطبيق جاهز للعمل حتى بدون إنترنت.")
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) {
          void registration.update()
        }
      }, 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      if (wasOfflineRef.current) {
        toast.success("تم استعادة الاتصال بالإنترنت.")
      }
      wasOfflineRef.current = false
    }

    function handleOffline() {
      setIsOffline(true)
      wasOfflineRef.current = true
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      role="status"
      dir="rtl"
      className="bg-amber-600 text-white px-4 py-2 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>أنت غير متصل بالإنترنت — يتم عرض البيانات المحفوظة محلياً</span>
    </div>
  )
}
