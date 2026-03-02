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
import AdminCategoryPage from './pages/admin/categories/AdminCategoryPage';
import AdminOrderPage from './pages/admin/AdminOrderPage';
import AdminUserPage from './pages/admin/AdminUserPage';
import ProductList from "./pages/admin/products/list";
import ProductCreate from "./pages/admin/products/create";
import ProductEdit from "./pages/admin/products/edit";
import SearchPage from './components/home/SearchPage';
import './App.css';

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

                    {/* ADMIN */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboardPage />} />
                        <Route path="categories" element={<AdminCategoryPage />} />

                        <Route path="products">
                            <Route index element={<ProductList />} />
                            <Route path="create" element={<ProductCreate />} />
                            <Route path="edit/:id" element={<ProductEdit />} />
                        </Route>

                        <Route path="orders" element={<AdminOrderPage />} />
                        <Route path="users" element={<AdminUserPage />} />
                    </Route>

                    {/* PUBLIC */}
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
                        <Route path="/search" element={<SearchPage />} />
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