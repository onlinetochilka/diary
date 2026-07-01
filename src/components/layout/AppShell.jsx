/**
 * AppShell.jsx — Root layout wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Coordinates the full-page layout:
 *   Desktop (≥ lg):  Sidebar (fixed left) + main content offset by sidebar width
 *   Mobile  (< lg):  Full-width main + BottomTabs (fixed bottom)
 *
 * Manages active page state and passes navigation handlers to children.
 */
import { useState } from "react";
import { cn } from "../../utils/cn.js";
import Sidebar from "./Sidebar.jsx";
import BottomTabs from "./BottomTabs.jsx";

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children  — receives (activePage, onNavigate)
 *        OR pass a render prop: children={(page, nav) => <Pages page={page} />}
 * @param {string} [props.defaultPage] — initial active page id
 */
export default function AppShell({ children, defaultPage = "dashboard" }) {
  const [activePage, setActivePage] = useState(defaultPage);

  function handleNavigate(page) {
    setActivePage(page);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Support render prop pattern
  const content =
    typeof children === "function"
      ? children(activePage, handleNavigate)
      : children;

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
          "min-w-0 max-w-full overflow-x-hidden",
          // Animate in
          "animate-fade-in",
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

        {content}
      </main>

      {/* ── Mobile Bottom Tabs ── */}
      <BottomTabs activePage={activePage} onNavigate={handleNavigate} />
    </div>
  );
}
