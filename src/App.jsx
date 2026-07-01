import { useEffect } from "react";
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

  useEffect(() => {
    initAnalytics();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <AppShell defaultPage="dashboard">
        {(activePage, onNavigate) => {
          const Page = PAGE_MAP[activePage] ?? DashboardPage;
          return <Page onNavigate={onNavigate} />;
        }}
      </AppShell>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  );
}
