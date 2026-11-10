import { Navigate, Route, Routes } from "react-router"

import { useAuth } from "./auth/auth-context"
import { DashboardPage } from "./pages/dashboard-page"
import { LoginPage } from "./pages/login-page"

function LoadingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center" dir="rtl">
      جار التحميل...
    </main>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingPage />
  }

  return user ? <DashboardPage /> : <Navigate replace to="/login" />
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
      <Route path="/dashboard" element={<ProtectedRoutes />} />
      <Route path="*" element={<Navigate replace to="/dashboard" />} />
    </Routes>
  )
}
