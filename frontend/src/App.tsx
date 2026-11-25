import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useToken } from './api/token'
import AppLayout from './components/AppLayout'
import SignInPage from './features/auth/SignInPage'
import EmployeesPage from './features/employees/EmployeesPage'
import InsightsPage from './features/insights/InsightsPage'

// Signed-out visitors go to sign-in, remembering where they were heading.
function RequireSignIn() {
  const token = useToken()
  const location = useLocation()
  if (!token) return <Navigate to="/sign-in" replace state={{ from: location.pathname + location.search + location.hash }} />
  return <Outlet />
}

export default function App() {
  const token = useToken()
  const queryClient = useQueryClient()

  // Signed out (button or expired token): drop cached salaries so nothing outlives the session.
  useEffect(() => {
    if (!token) queryClient.clear()
  }, [token, queryClient])

  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<RequireSignIn />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  )
}
