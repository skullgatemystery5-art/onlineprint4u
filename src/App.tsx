import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import { Toaster } from '@/components/ui/sonner';
import { FloatingWidgets } from '@/components/floating-widgets';
import { Loader2 } from 'lucide-react';

const HomePage = lazy(() => import('@/pages/home'));
const PrintPage = lazy(() => import('@/pages/print'));
const CartPage = lazy(() => import('@/pages/cart'));
const CheckoutPage = lazy(() => import('@/pages/checkout'));
const LoginPage = lazy(() => import('@/pages/login'));
const SignupPage = lazy(() => import('@/pages/signup'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const AdminPage = lazy(() => import('@/pages/admin'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const DeliveryDetailsPage = lazy(() => import('@/pages/delivery-details'));
const OrderSuccessPage = lazy(() => import('@/pages/order-success'));
const OrderFailedPage = lazy(() => import('@/pages/order-failed'));
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function FloatingWidgetsOnNonHome() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  return <FloatingWidgets />;
}

function PageLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/print" element={<PrintPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/delivery-details" element={<DeliveryDetailsPage />} />
              <Route path="/order/success" element={<OrderSuccessPage />} />
              <Route path="/order/failed" element={<OrderFailedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <FloatingWidgetsOnNonHome />
          <Toaster />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
