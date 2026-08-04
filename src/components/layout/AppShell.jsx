/**
 * AppShell.jsx — Root layout wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Coordinates the full-page layout:
 *   Desktop (≥ lg):  Sidebar (fixed left) + main content offset by sidebar width
 *   Mobile  (< lg):  Full-width main + BottomTabs (fixed bottom)
 *
 * Manages active page state and passes navigation handlers to children.
 */
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { cn } from "../../utils/cn.js";
import Sidebar from "./Sidebar.jsx";
import BottomTabs from "./BottomTabs.jsx";

export default function AppShell({ defaultPage = "dashboard" }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract the current page from pathname, e.g. "/dashboard" -> "dashboard"
  const activePage = location.pathname.split("/")[1] || defaultPage;

  function handleNavigate(page, state = null) {
    navigate(`/${page}`, { state });
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="relative min-h-dvh">
      {/* ── Desktop Sidebar ── */}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />

      {/* ── Main Content Area ── */}
      <main
        id="main-content"
        className={cn(
          // On desktop: offset for sidebar
          "lg:ml-[240px]",
          // On mobile: bottom padding for BottomTabs
          "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0",
          // Prevent horizontal overflow
          "min-w-0 max-w-full overflow-x-hidden"
        )}
      >
        {/* Skip-to-main link for accessibility */}
        <a
          href="#main-content"
          className={cn(
            "sr-only focus:not-sr-only",
            "fixed top-4 left-1/2 -translate-x-1/2 z-50",
            "bg-indigo-600 text-white text-sm font-medium",
            "px-4 py-2 rounded-xl shadow-float",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
          )}
        >
          Перейти к содержимому
        </a>

        <Outlet />
      </main>

      {/* ── Mobile Bottom Tabs ── */}
      <BottomTabs activePage={activePage} onNavigate={handleNavigate} />
    </div>
  );
}

