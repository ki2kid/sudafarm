import { Navigate, Route, Routes } from "react-router"
import type { ReactNode } from "react"
import { Toaster } from "./components/toaster"

import { useAuth } from "./auth/auth-context"
import { DashboardPage } from "./pages/dashboard-page"
import { LocationsPage } from "./pages/locations-page"
import { LoginPage } from "./pages/login-page"
import { RegisterPage } from "./pages/register-page"
import { ListingsPage } from "./pages/listings-page"
import { CreateListingPage } from "./pages/create-listing-page"

function LoadingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center" dir="rtl">
      جار التحميل...
    </main>
  )
}

function ProtectedRoutes({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingPage />
  return user ? children : <Navigate replace to="/login" />
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingPage />
  return user ? <Navigate replace to="/dashboard" /> : children
}

export function App() {
  return (
    <>
      <Toaster dir="rtl" />
      <Routes>
        <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

        <Route path="/dashboard"       element={<ProtectedRoutes><DashboardPage /></ProtectedRoutes>} />
        <Route path="/listings"        element={<ProtectedRoutes><ListingsPage /></ProtectedRoutes>} />
        <Route path="/listings/create" element={<ProtectedRoutes><CreateListingPage /></ProtectedRoutes>} />
        <Route path="/locations"       element={<ProtectedRoutes><LocationsPage /></ProtectedRoutes>} />

        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Routes>
    </>
  )
}
