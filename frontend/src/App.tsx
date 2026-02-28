import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/layout/PrivateRoute';
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import BestsellerPage from './pages/BestsellerPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCategoryPage from './pages/admin/AdminCategoryPage';
import AdminProductPage from './pages/admin/AdminProductPage';
import AdminOrderPage from './pages/admin/AdminOrderPage';
import AdminUserPage from './pages/admin/AdminUserPage';
import './App.css';

// Wrapper that applies the public Layout to all child routes
const PublicRoot = () => (
  <Layout>
    <Outlet />
  </Layout>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin routes – use AdminLayout, no public header/footer */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="categories" element={<AdminCategoryPage />} />
            <Route path="products" element={<AdminProductPage />} />
            <Route path="orders" element={<AdminOrderPage />} />
            <Route path="users" element={<AdminUserPage />} />
          </Route>

          {/* Public routes – wrapped in public Layout */}
          <Route element={<PublicRoot />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/checkout" element={<CheckoutPage />} />
            </Route>
            <Route path="/bestseller" element={<BestsellerPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
