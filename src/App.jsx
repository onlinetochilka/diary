import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import SplashScreen from "./components/layout/SplashScreen.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import { ConfirmProvider } from "./contexts/ConfirmContext.jsx";
import {
  DashboardPage,
  SchedulePage,
  StudentsPage,
  FinancePage,
  SettingsPage,
  ProgramsPage,
  LandingPage,
  BillingPage,
} from "./pages/Pages.jsx";
import { initAnalytics } from "./utils/analytics.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { ToastProvider } from './components/ui/Toast.jsx';
import { TooltipProvider } from "./components/ui/Tooltip.jsx";

import GuestPortalView from "./pages/GuestPortalView.jsx";

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
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <TooltipProvider>
            <ToastProvider>
              <RootApp />
            </ToastProvider>
          </TooltipProvider>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
