import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from '../features/catalog/HomePage'
import LoginPage from '../features/auth/LoginPage'
import RequireAuth from '../features/auth/RequireAuth'
import AdminHome from '../features/admin/AdminHome'

export default function App() {
  return (
    <Routes>
      {/* Parte pública */}
      <Route path="/" element={<HomePage />} />

      {/* Parte privada */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminHome />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
