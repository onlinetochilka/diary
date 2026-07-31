import { useEffect, useState } from "react";
import AppShell from "./components/layout/AppShell.jsx";
import SplashScreen from "./components/layout/SplashScreen.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import {
  DashboardPage,
  SchedulePage,
  StudentsPage,
  FinancePage,
  SettingsPage,
  ProgramsPage,
} from "./pages/Pages.jsx";
import { initAnalytics } from "./utils/analytics.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { ToastProvider } from "./components/ui/index.js";
import { TooltipProvider } from "./components/ui/Tooltip.jsx";

import GuestPortalView from "./pages/GuestPortalView.jsx";

const PAGE_MAP = {
  dashboard: DashboardPage,
  schedule:  SchedulePage,
  students:  StudentsPage,
  programs:  ProgramsPage,
  finance:   FinancePage,
  settings:  SettingsPage,
};

function RootApp() {
  const { user, isLoading } = useAuth();
  const [guestHash, setGuestHash] = useState(null);

  useEffect(() => {
    initAnalytics();
    
    // Check for guest hash in URL
    const params = new URLSearchParams(window.location.search);
    const hash = params.get('guest');
    if (hash) {
      setGuestHash(hash);
    }
  }, []);

  if (guestHash) {
    return (
      <ErrorBoundary>
        <GuestPortalView hash={guestHash} />
      </ErrorBoundary>
    );
  }

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <AppShell defaultPage="dashboard">
        {(activePage, onNavigate, pageState) => {
          const Page = PAGE_MAP[activePage] ?? DashboardPage;
          return <Page onNavigate={onNavigate} pageState={pageState} />;
        }}
      </AppShell>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <ToastProvider>
          <RootApp />
        </ToastProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
