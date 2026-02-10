import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/layout/PrivateRoute';
import Layout from './components/layout/Layout';
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
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
