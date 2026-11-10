import { Navigate, Route, Routes } from "react-router"
import type { ReactNode } from "react"

import { useAuth } from "./auth/auth-context"
import { DashboardPage } from "./pages/dashboard-page"
import { LoginPage } from "./pages/login-page"
import { LocationsPage } from "./pages/locations-page"

function LoadingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center" dir="rtl">
      جار التحميل...
    </main>
  )
}

function ProtectedRoutes({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  return user ? children : <Navigate replace to="/login" />
}

function PublicRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  return user ? <Navigate replace to="/dashboard" /> : <LoginPage />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoutes />} />
      <Route path="/dashboard" element={<ProtectedRoutes><DashboardPage /></ProtectedRoutes>} />
      <Route path="/locations" element={<ProtectedRoutes><LocationsPage /></ProtectedRoutes>} />
      <Route path="*" element={<Navigate replace to="/dashboard" />} />
    </Routes>
  )
}
