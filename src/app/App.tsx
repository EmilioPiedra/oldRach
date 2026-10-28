import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from '../features/catalog/PublicLayout'
import CatalogPage from '../features/catalog/CatalogPage'
import ProductPage from '../features/catalog/ProductPage'
import CartPage from '../features/cart/CartPage'
import LoginPage from '../features/auth/LoginPage'
import RequireAuth from '../features/auth/RequireAuth'
import AdminLayout from '../features/admin/AdminLayout'
import ProductList from '../features/admin/ProductList'
import ProductForm from '../features/admin/ProductForm'
import SimpleCatalog from '../features/admin/SimpleCatalog'

export default function App() {
  return (
    <Routes>
      {/* Parte pública */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/producto/:id" element={<ProductPage />} />
        <Route path="/carrito" element={<CartPage />} />
      </Route>

      {/* Parte privada */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="productos" replace />} />
        <Route path="productos" element={<ProductList />} />
        <Route path="productos/nuevo" element={<ProductForm key="nuevo" />} />
        <Route path="productos/:id" element={<ProductForm key="editar" />} />
        <Route path="marcas" element={<SimpleCatalog key="brands" table="brands" titulo="Marcas" />} />
        <Route
          path="categorias"
          element={<SimpleCatalog key="categories" table="categories" titulo="Categorías" />}
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
