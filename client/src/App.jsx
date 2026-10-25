import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ChatAssistant from './components/ChatAssistant';

// Pages
import Home from './pages/Home';
import ProductList from './pages/products/ProductList';
import ProductDetail from './pages/products/ProductDetail';

// Artisan pages
import ArtisanSignup from './pages/artisan/ArtisanSignup';
import ArtisanLogin from './pages/artisan/ArtisanLogin';
import ArtisanDashboard from './pages/artisan/ArtisanDashboard';
import ProductUpload from './pages/artisan/ProductUpload';
import ProductEdit from './pages/artisan/ProductEdit';

// Customer pages
import CustomerSignup from './pages/customer/CustomerSignup';
import CustomerLogin from './pages/customer/CustomerLogin';
import Cart from './pages/customer/Cart';
import Orders from './pages/customer/Orders';

function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-white py-10 text-ink/70">
      <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs">
        <div>
          <span className="font-display text-lg font-bold text-ink">
            Kala<span className="text-madder">Connect</span>
          </span>
          <p className="mt-1 text-stone">
            Connecting India's traditional master craftspeople directly with conscious patrons.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <span>© {new Date().getFullYear()} KalaConnect</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-cream text-ink">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/:id" element={<ProductDetail />} />

              {/* Artisan auth & dashboard */}
              <Route path="/artisan/signup" element={<ArtisanSignup />} />
              <Route path="/artisan/login" element={<ArtisanLogin />} />
              <Route
                path="/artisan/dashboard"
                element={
                  <ProtectedRoute role="artisan">
                    <ArtisanDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/artisan/products"
                element={
                  <ProtectedRoute role="artisan">
                    <ArtisanDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/artisan/upload"
                element={
                  <ProtectedRoute role="artisan">
                    <ProductUpload />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/artisan/products/:id/edit"
                element={
                  <ProtectedRoute role="artisan">
                    <ProductEdit />
                  </ProtectedRoute>
                }
              />

              {/* Customer auth, cart & orders */}
              <Route path="/customer/signup" element={<CustomerSignup />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route
                path="/customer/cart"
                element={
                  <ProtectedRoute role="customer">
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/orders"
                element={
                  <ProtectedRoute role="customer">
                    <Orders />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <ChatAssistant />
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
