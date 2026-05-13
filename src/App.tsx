import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import {
  CheckEmailPage,
  ForgotPasswordPage,
  RegisterPage,
  ResetPasswordPage,
  SignInPage,
  VerifyEmailPage,
} from './features/auth/AuthPages';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { BookingsPage } from './features/bookings/BookingPage';
import { FulfillmentPage } from './features/fulfillment/FulfillmentPage';
import { ResourcesPage } from './features/resources/ResourcePage';
import { VariantsPage } from './features/variants/VariantsPage';
import { OffersPage } from './features/offers/OffersPage';
import { AvailabilityPage } from './features/availability/AvailabilityPage';
import { PricingPage } from './features/pricing/PricingPage';
import { PolicyPage } from './features/policy/PolicyPage';
import { ReportsPage } from './features/reports/ReportsPage';

const pageConfig: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Provider overview' },
  '/bookings': { title: 'Bookings', subtitle: 'All provider bookings' },
  '/fulfillment': { title: 'Fulfillment', subtitle: 'Handovers, returns, and issue reports' },
  '/resources': { title: 'Resources', subtitle: 'Inventory catalog management' },
  '/variants': { title: 'Variants', subtitle: 'Resource variant management' },
  '/offers': { title: 'Offers', subtitle: 'Customer-facing rental offers' },
  '/availability': { title: 'Availability', subtitle: 'Booking horizons and capacity' },
  '/pricing': { title: 'Pricing', subtitle: 'Pricing rules and adjustments' },
  '/policy': { title: 'Policy', subtitle: 'Cancellation, deposits, and terms' },
  '/reports': { title: 'Reports', subtitle: 'Performance and analytics' },
};

function AppShell() {
  const { user, memberships, loading } = useAuth();
  const knownPaths = useMemo(() => new Set(Object.keys(pageConfig)), []);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const params = new URLSearchParams(window.location.search);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(window.location.pathname || '/');
  };

  const navigateTo = (nextPath: string) => {
    const safePath = knownPaths.has(nextPath) ? nextPath : '/';
    const nextUrl = safePath === '/bookings' ? `/bookings${window.location.search}` : safePath;
    if (window.location.pathname !== safePath || window.location.search !== (safePath === '/bookings' ? window.location.search : '')) {
      window.history.pushState({}, '', nextUrl);
    }
    setCurrentPath(safePath);
  };

  useEffect(() => {
    if (!loading && user && user.emailVerified !== false && memberships.length === 0 && currentPath !== '/onboarding') {
      navigate('/onboarding', true);
    }
  }, [currentPath, loading, memberships.length, user]);

  const renderAuthPage = () => {
    if (currentPath === '/auth/register') return <RegisterPage onNavigate={navigate} />;
    if (currentPath === '/auth/check-email') return <CheckEmailPage email={params.get('email') ?? user?.email ?? ''} onNavigate={navigate} />;
    if (currentPath === '/auth/verify-email' || currentPath === '/auth/verify-mail') return <VerifyEmailPage token={params.get('token')} onNavigate={navigate} />;
    if (currentPath === '/auth/forgot-password') return <ForgotPasswordPage onNavigate={navigate} />;
    if (currentPath === '/auth/reset-password') return <ResetPasswordPage token={params.get('token')} onNavigate={navigate} />;
    return <SignInPage onNavigate={navigate} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPath.startsWith('/auth')) {
    return renderAuthPage();
  }

  if (!user) {
    return <SignInPage onNavigate={navigate} />;
  }

  if (user.emailVerified === false) {
    return <CheckEmailPage email={user.email} onNavigate={navigate} />;
  }

  if (memberships.length === 0) {
    return <OnboardingPage />;
  }

  const appPath = knownPaths.has(currentPath) ? currentPath : '/';
  const page = pageConfig[appPath] || { title: 'Partner Console' };

  const renderPage = () => {
    if (appPath === '/') return <DashboardPage onNavigate={navigateTo} />;
    if (appPath === '/bookings') {
      return <BookingsPage onHeaderActionsChange={setHeaderActions} />;
    }
    if (appPath === '/fulfillment') return <FulfillmentPage />;
    if (appPath === '/resources') return <ResourcesPage />;
    if (appPath === '/variants') return <VariantsPage />;
    if (appPath === '/offers') return <OffersPage />;
    if (appPath === '/availability') return <AvailabilityPage />;
    if (appPath === '/pricing') return <PricingPage />;
    if (appPath === '/policy') return <PolicyPage />;
    if (appPath === '/reports') return <ReportsPage />;
    return <DashboardPage onNavigate={navigateTo} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar
        currentPath={appPath}
        onNavigate={navigateTo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f3f6fb]">
        <Header title={page.title} subtitle={page.subtitle} actions={headerActions} />
        <main className={`relative min-h-0 flex-1 ${appPath === '/bookings' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
