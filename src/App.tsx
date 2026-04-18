import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { SignInPage } from './features/auth/SignInPage';
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
  const { user, loading } = useAuth();
  const knownPaths = useMemo(() => new Set(Object.keys(pageConfig)), []);
  const getPathFromLocation = () => {
    const pathname = window.location.pathname || '/';
    return knownPaths.has(pathname) ? pathname : '/';
  };
  const [currentPath, setCurrentPath] = useState(getPathFromLocation);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(getPathFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (nextPath: string) => {
    const safePath = knownPaths.has(nextPath) ? nextPath : '/';
    const nextUrl = safePath === '/bookings' ? `/bookings${window.location.search}` : safePath;
    if (window.location.pathname !== safePath || window.location.search !== (safePath === '/bookings' ? window.location.search : '')) {
      window.history.pushState({}, '', nextUrl);
    }
    setCurrentPath(safePath);
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

  if (!user) {
    return <SignInPage />;
  }

  const page = pageConfig[currentPath] || { title: 'Partner Console' };

  const renderPage = () => {
    if (currentPath === '/') return <DashboardPage onNavigate={navigateTo} />;
    if (currentPath === '/bookings') {
      return <BookingsPage onHeaderActionsChange={setHeaderActions} />;
    }
    if (currentPath === '/fulfillment') return <FulfillmentPage />;
    if (currentPath === '/resources') return <ResourcesPage />;
    if (currentPath === '/variants') return <VariantsPage />;
    if (currentPath === '/offers') return <OffersPage />;
    if (currentPath === '/availability') return <AvailabilityPage />;
    if (currentPath === '/pricing') return <PricingPage />;
    if (currentPath === '/policy') return <PolicyPage />;
    if (currentPath === '/reports') return <ReportsPage />;
    return <DashboardPage onNavigate={navigateTo} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar
        currentPath={currentPath}
        onNavigate={navigateTo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f3f6fb]">
        <Header title={page.title} subtitle={page.subtitle} actions={headerActions} />
        <main className={`relative min-h-0 flex-1 ${currentPath === '/bookings' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
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
